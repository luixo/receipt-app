import React from "react";
import { View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { QueryErrorMessage } from "~app/components/error-message";
import { useCurrencies } from "~app/hooks/use-currencies";
import { useLocale } from "~app/hooks/use-locale";
import type { TRPCQueryInput, TRPCQueryResult } from "~app/trpc";
import { getCurrencyDescription } from "~app/utils/currency";
import type { CurrencyCode } from "~app/utils/currency";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";

type LoaderProps = {
	query: TRPCQueryResult<"currency.getList">;
	selectedCurrencyCode?: CurrencyCode;
	onChange: (nextCurrencyCode: CurrencyCode) => void;
	topQueryOptions: TRPCQueryInput<"currency.top">["options"];
	hiddenCurrencies?: CurrencyCode[];
};

const CurrenciesPickerLoader: React.FC<LoaderProps> = ({
	query,
	selectedCurrencyCode,
	onChange,
	topQueryOptions,
	hiddenCurrencies = [],
}) => {
	const locale = useLocale();
	const trpc = useTRPC();
	const topCurrenciesQuery = useQuery(
		trpc.currency.top.queryOptions({
			options: topQueryOptions,
		}),
	);
	const topCurrencyCodes = React.useMemo(() => {
		if (!topCurrenciesQuery.data) {
			return;
		}
		return topCurrenciesQuery.data
			.map(({ currencyCode }) => currencyCode)
			.filter((code) => !hiddenCurrencies.includes(code));
	}, [hiddenCurrencies, topCurrenciesQuery.data]);
	const cutIndex = topCurrencyCodes ? topCurrencyCodes.length : 0;
	const codes = React.useMemo(() => {
		if (!query.data) {
			return;
		}
		return query.data.filter((code) => !hiddenCurrencies.includes(code));
	}, [hiddenCurrencies, query.data]);
	const sortedCodes = topCurrencyCodes
		? codes
			? codes.sort(
					(a, b) => topCurrencyCodes.indexOf(b) - topCurrencyCodes.indexOf(a),
				)
			: topCurrencyCodes
		: codes || [];
	const formattedCurrencies = sortedCodes.map((currencyCode) => ({
		code: currencyCode,
		description: getCurrencyDescription(locale, currencyCode),
	}));
	return (
		<View className="flex-row flex-wrap gap-2">
			{formattedCurrencies.map(({ code, description }, index) => (
				<React.Fragment key={code}>
					{index === cutIndex && index !== 0 ? (
						<Divider className="my-2" />
					) : null}
					<Button
						onPress={() => onChange(code)}
						variant="flat"
						color={code === selectedCurrencyCode ? "success" : "primary"}
						title={code}
						data-testid="currency-button"
					>
						{description}
					</Button>
				</React.Fragment>
			))}
		</View>
	);
};

type WrapperProps = Omit<LoaderProps, "query"> & {
	modalOpen: boolean;
	switchModalOpen: (open: boolean) => void;
	onLoad?: (
		currencyCodes: CurrencyCode[],
		topCurrencyCodes: CurrencyCode[],
	) => void;
};

export const CurrenciesPicker: React.FC<WrapperProps> = ({
	modalOpen,
	switchModalOpen,
	onLoad,
	topQueryOptions,
	...props
}) => {
	const trpc = useTRPC();
	const query = useCurrencies();
	const topCurrenciesQuery = useQuery(
		trpc.currency.top.queryOptions({
			options: topQueryOptions,
		}),
	);
	React.useEffect(() => {
		if (
			onLoad &&
			query.status === "success" &&
			topCurrenciesQuery.status === "success"
		) {
			onLoad(
				query.data,
				topCurrenciesQuery.data.map(({ currencyCode }) => currencyCode),
			);
		}
	}, [onLoad, query, topCurrenciesQuery]);
	const { t } = useTranslation("default");
	return (
		<Modal
			aria-label={t("components.currenciesPicker.label")}
			isOpen={modalOpen}
			onOpenChange={switchModalOpen}
			scrollBehavior="inside"
			classNames={{ base: "mb-24 sm:mb-32 max-w-xl" }}
			data-testid="currencies-picker"
		>
			<ModalContent>
				<ModalHeader>
					<Text className="text-2xl font-medium">
						{t("components.currenciesPicker.title")}
					</Text>
				</ModalHeader>
				<ModalBody>
					<CurrenciesPickerLoader
						query={query}
						topQueryOptions={topQueryOptions}
						{...props}
					/>
					{query.status === "pending" ? (
						<Spinner />
					) : query.status === "error" ? (
						<QueryErrorMessage query={query} />
					) : null}
				</ModalBody>
			</ModalContent>
		</Modal>
	);
};
