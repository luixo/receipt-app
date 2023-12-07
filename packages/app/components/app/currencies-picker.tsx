import React from "react";

import { Modal } from "@nextui-org/react";
import { Button, Divider, Spinner } from "@nextui-org/react-tailwind";
import type { QueryObserverSuccessResult } from "@tanstack/react-query";

import { Text } from "app/components/base/text";
import { QueryErrorMessage } from "app/components/error-message";
import { Grid } from "app/components/grid";
import type { TRPCError, TRPCQueryOutput, TRPCQueryResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import { MONTH } from "app/utils/time";

type CurrencyList = TRPCQueryOutput<"currency.getList">;
type CurrencyListItem = CurrencyList[number];

type InnerProps = {
	query: QueryObserverSuccessResult<CurrencyList, TRPCError>;
	selectedCurrency?: CurrencyListItem;
	onChange: (nextCurrency: CurrencyListItem) => void;
	topCurrenciesQuery:
		| TRPCQueryResult<"currency.topDebts">
		| TRPCQueryResult<"currency.topReceipts">;
};

const CurrenciesPickerInner: React.FC<InnerProps> = ({
	query,
	selectedCurrency,
	onChange,
	topCurrenciesQuery,
}) => {
	const topCurrencyCodes =
		topCurrenciesQuery.status === "success"
			? topCurrenciesQuery.data.map(({ currencyCode }) => currencyCode)
			: undefined;
	const cutIndex = topCurrencyCodes ? topCurrencyCodes.length : 0;
	const list = topCurrencyCodes
		? query.data.sort(
				(a, b) =>
					topCurrencyCodes.indexOf(b.code) - topCurrencyCodes.indexOf(a.code),
		  )
		: query.data;
	return (
		<Grid.Container gap={1}>
			{list.map((currency, index) => (
				<React.Fragment key={currency.code}>
					{index === cutIndex && index ? <Divider className="my-2" /> : null}
					<Grid>
						<Button
							onClick={() => onChange(currency)}
							variant="flat"
							color={
								currency.code === selectedCurrency?.code ? "success" : "primary"
							}
						>
							{`${currency.name} (${currency.code}${
								currency.code === currency.symbol ? "" : ` / ${currency.symbol}`
							})`}
						</Button>
					</Grid>
				</React.Fragment>
			))}
		</Grid.Container>
	);
};

type LoaderProps = Omit<InnerProps, "query"> & {
	query: TRPCQueryResult<"currency.getList">;
};

const CurrenciesPickerLoader: React.FC<LoaderProps> = ({ query, ...props }) => {
	if (query.status === "loading") {
		return <Spinner />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <CurrenciesPickerInner {...props} query={query} />;
};

type WrapperProps = Omit<LoaderProps, "query"> & {
	modalOpen: boolean;
	onModalClose: () => void;
	onLoad?: (
		currencies: CurrencyListItem[],
		topCurrencyCodes: CurrencyCode[],
	) => void;
};

export const CurrenciesPicker: React.FC<WrapperProps> = ({
	modalOpen,
	onModalClose,
	onLoad,
	topCurrenciesQuery,
	...props
}) => {
	const query = trpc.currency.getList.useQuery(
		{ locale: "en" },
		{ trpc: { ssr: false }, staleTime: MONTH },
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
	return (
		<Modal
			closeButton
			aria-label="Currency picker"
			open={modalOpen}
			onClose={onModalClose}
			width="90%"
		>
			<Modal.Header>
				<Text className="text-2xl font-medium">Please choose currency</Text>
			</Modal.Header>
			<Modal.Body>
				<CurrenciesPickerLoader
					query={query}
					topCurrenciesQuery={topCurrenciesQuery}
					{...props}
				/>
			</Modal.Body>
		</Modal>
	);
};
