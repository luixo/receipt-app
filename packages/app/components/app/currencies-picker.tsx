import React from "react";
import { View } from "react-native";

import { QueryErrorMessage } from "~app/components/error-message";
import { useCurrencies } from "~app/hooks/use-currencies";
import { useFormattedCurrencies } from "~app/hooks/use-formatted-currency";
import type { TRPCQueryResult } from "~app/trpc";
import { type CurrencyCode } from "~app/utils/currency";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";

type LoaderProps = {
	query: TRPCQueryResult<"currency.getList">;
	selectedCurrencyCode?: CurrencyCode;
	onChange: (nextCurrencyCode: CurrencyCode) => void;
	topCurrenciesQuery:
		| TRPCQueryResult<"currency.topDebts">
		| TRPCQueryResult<"currency.topReceipts">;
};

const CurrenciesPickerLoader: React.FC<LoaderProps> = ({
	query,
	selectedCurrencyCode,
	onChange,
	topCurrenciesQuery,
}) => {
	const topCurrencyCodes =
		topCurrenciesQuery.status === "success"
			? topCurrenciesQuery.data.map(({ currencyCode }) => currencyCode)
			: undefined;
	const cutIndex = topCurrencyCodes ? topCurrencyCodes.length : 0;
	const codes = query.data ? query.data.map(({ code }) => code) : undefined;
	const formattedCurrencies = useFormattedCurrencies(
		topCurrencyCodes
			? codes
				? codes.sort(
						(a, b) => topCurrencyCodes.indexOf(b) - topCurrencyCodes.indexOf(a),
				  )
				: topCurrencyCodes
			: codes || [],
	);
	return (
		<View className="flex-row flex-wrap gap-2">
			{formattedCurrencies.map(({ code, symbol, name }, index) => (
				<React.Fragment key={code}>
					{index === cutIndex && index !== 0 ? (
						<Divider className="my-2" />
					) : null}
					<Button
						onClick={() => onChange(code)}
						variant="flat"
						color={code === selectedCurrencyCode ? "success" : "primary"}
						title={code}
						data-testid="currency-button"
					>
						{name === code && symbol === code
							? code
							: `${name} (${code}${code === symbol ? "" : ` / ${symbol}`})`}
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
	topCurrenciesQuery,
	...props
}) => {
	const query = useCurrencies();
	React.useEffect(() => {
		if (
			onLoad &&
			query.status === "success" &&
			topCurrenciesQuery.status === "success"
		) {
			onLoad(
				query.data.map(({ code }) => code),
				topCurrenciesQuery.data.map(({ currencyCode }) => currencyCode),
			);
		}
	}, [onLoad, query, topCurrenciesQuery]);
	return (
		<Modal
			aria-label="Currencies picker"
			isOpen={modalOpen}
			onOpenChange={switchModalOpen}
			scrollBehavior="inside"
			classNames={{ base: "mb-24 sm:mb-32 max-w-xl" }}
			data-testid="currencies-picker"
		>
			<ModalContent>
				<ModalHeader>
					<Text className="text-2xl font-medium">Please choose currency</Text>
				</ModalHeader>
				<ModalBody>
					<CurrenciesPickerLoader
						query={query}
						topCurrenciesQuery={topCurrenciesQuery}
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
