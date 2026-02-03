import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useLocale } from "~app/hooks/use-locale";
import type { TRPCQueryInput } from "~app/trpc";
import { getCurrencyDescription } from "~app/utils/currency";
import type { CurrencyCode } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Modal } from "~components/modal";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import { View } from "~components/view";
import { rotate } from "~utils/array";
import { getIndexByString } from "~utils/hash";

const widths = ["w-20", "w-20", "w-20", "w-32", "w-32", "w-48"];
const SkeletonCurrencyButton = () => {
	const id = React.useId();
	return (
		<Button variant="flat" color="primary">
			<Skeleton
				className={`h-4 ${rotate(widths, getIndexByString(id))[0]} rounded-md`}
			/>
		</Button>
	);
};

type LoaderProps = {
	selectedCurrencyCode?: CurrencyCode;
	onChange: (nextCurrencyCode: CurrencyCode) => void;
	topQueryOptions: TRPCQueryInput<"currency.top">["options"];
	hiddenCurrencies?: CurrencyCode[];
	onLoad?: (
		currencyCodes: CurrencyCode[],
		topCurrencyCodes: CurrencyCode[],
	) => void;
};

const CurrenciesPickerLoader = suspendedFallback<LoaderProps>(
	({
		selectedCurrencyCode,
		onChange,
		topQueryOptions,
		hiddenCurrencies = [],
		onLoad,
	}) => {
		const locale = useLocale();
		const trpc = useTRPC();
		const { data: currencies } = useSuspenseQuery(
			trpc.currency.getList.queryOptions(),
		);
		const { data: topCurrencies } = useSuspenseQuery(
			trpc.currency.top.queryOptions({
				options: topQueryOptions,
			}),
		);
		const topCurrencyCodes = React.useMemo(
			() =>
				topCurrencies
					.map(({ currencyCode }) => currencyCode)
					.filter((code) => !hiddenCurrencies.includes(code)),
			[hiddenCurrencies, topCurrencies],
		);
		const codes = React.useMemo(
			() => currencies.filter((code) => !hiddenCurrencies.includes(code)),
			[hiddenCurrencies, currencies],
		);
		onLoad?.(codes, topCurrencyCodes);
		const sortedCodes = codes.toSorted(
			(a, b) => topCurrencyCodes.indexOf(b) - topCurrencyCodes.indexOf(a),
		);
		const formattedCurrencies = sortedCodes.map((currencyCode) => ({
			code: currencyCode,
			description: getCurrencyDescription(locale, currencyCode),
		}));
		return (
			<View className="flex-row flex-wrap gap-2">
				{formattedCurrencies.map(({ code, description }, index) => (
					<React.Fragment key={code}>
						{index === topCurrencies.length && index !== 0 ? (
							<Divider className="my-2" />
						) : null}
						<Button
							onPress={() => onChange(code)}
							variant="flat"
							color={code === selectedCurrencyCode ? "success" : "primary"}
							title={code}
							testID="currency-button"
						>
							{description}
						</Button>
					</React.Fragment>
				))}
			</View>
		);
	},
	() => (
		<View className="flex-row flex-wrap gap-2">
			{Array.from({ length: 3 }).map((_, index) => (
				// eslint-disable-next-line react/no-array-index-key
				<SkeletonCurrencyButton key={index} />
			))}
			<Divider className="my-2" />
			{Array.from({ length: 10 }).map((_, index) => (
				// eslint-disable-next-line react/no-array-index-key
				<SkeletonCurrencyButton key={index} />
			))}
		</View>
	),
);

type WrapperProps = LoaderProps & {
	modalOpen: boolean;
	switchModalOpen: (open: boolean) => void;
};

export const CurrenciesPicker: React.FC<WrapperProps> = ({
	modalOpen,
	switchModalOpen,
	topQueryOptions,
	...props
}) => {
	const { t } = useTranslation("default");
	return (
		<Modal
			label={t("components.currenciesPicker.label")}
			isOpen={modalOpen}
			onOpenChange={switchModalOpen}
			className="mb-24 max-w-xl sm:mb-32"
			testID="currencies-picker"
			header={
				<Text className="text-2xl font-medium">
					{t("components.currenciesPicker.title")}
				</Text>
			}
		>
			<CurrenciesPickerLoader topQueryOptions={topQueryOptions} {...props} />
		</Modal>
	);
};
