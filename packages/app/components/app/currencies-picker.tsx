import React from "react";

import { Button, Card, Loading, Modal, Text } from "@nextui-org/react";
import { QueryObserverSuccessResult } from "@tanstack/react-query";

import { QueryErrorMessage } from "app/components/error-message";
import { Grid } from "app/components/grid";
import { trpc, TRPCError, TRPCQueryOutput, TRPCQueryResult } from "app/trpc";
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
	const cutIndex =
		topCurrenciesQuery.status === "success"
			? topCurrenciesQuery.data.length
			: 0;
	const list =
		topCurrenciesQuery.status === "success"
			? query.data.sort(
					(a, b) =>
						topCurrenciesQuery.data.indexOf(b.code) -
						topCurrenciesQuery.data.indexOf(a.code)
			  )
			: query.data;
	return (
		<Grid.Container gap={1}>
			{list.map((currency, index) => (
				<React.Fragment key={currency.code}>
					{index === cutIndex && index ? <Card.Divider y={1} /> : null}
					<Grid>
						<Button
							onClick={() => onChange(currency)}
							auto
							flat
							color={
								currency.code === selectedCurrency?.code ? "success" : undefined
							}
						>
							{currency.name} ({currency.code}
							{currency.code === currency.symbol ? "" : ` / ${currency.symbol}`}
							)
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
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <CurrenciesPickerInner {...props} query={query} />;
};

type WrapperProps = Omit<LoaderProps, "query"> & {
	modalOpen: boolean;
	onModalClose: () => void;
	onLoad?: (currencies: CurrencyListItem[]) => void;
};

export const CurrenciesPicker: React.FC<WrapperProps> = ({
	modalOpen,
	onModalClose,
	onLoad,
	...props
}) => {
	const query = trpc.currency.getList.useQuery(
		{ locale: "en" },
		{ trpc: { ssr: false }, cacheTime: MONTH }
	);
	React.useEffect(() => {
		if (onLoad && query.status === "success") {
			onLoad(query.data);
		}
	}, [onLoad, query]);
	return (
		<Modal
			closeButton
			aria-label="Currency picker"
			open={modalOpen}
			onClose={onModalClose}
			width="90%"
		>
			<Modal.Header>
				<Text h3>Please choose currency</Text>
			</Modal.Header>
			<Modal.Body>
				<CurrenciesPickerLoader query={query} {...props} />
			</Modal.Body>
		</Modal>
	);
};
