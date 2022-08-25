import React from "react";

import { Button, Card, Loading, Modal, Text } from "@nextui-org/react";
import { QueryObserverSuccessResult } from "react-query";

import { QueryErrorMessage } from "app/components/error-message";
import { Grid } from "app/components/grid";
import { trpc, TRPCError, TRPCQueryOutput, TRPCQueryResult } from "app/trpc";
import { Currency } from "app/utils/currency";

type CurrencyList = TRPCQueryOutput<"currency.get-list">;
type CurrencyListItem = CurrencyList["list"][number];

type InnerProps = {
	query: QueryObserverSuccessResult<CurrencyList, TRPCError>;
	initialCurrencyCode?: Currency;
	selectedCurrency?: CurrencyListItem;
	onChange: (nextCurrency: CurrencyListItem) => void;
};

const CurrenciesPickerInner: React.FC<InnerProps> = ({
	query,
	selectedCurrency,
	initialCurrencyCode,
	onChange,
}) => {
	React.useEffect(() => {
		if (!selectedCurrency && initialCurrencyCode) {
			const matchedCurrency = query.data.list.find(
				(currency) => currency.code === initialCurrencyCode
			);
			if (matchedCurrency) {
				onChange(matchedCurrency);
			}
		}
	}, [selectedCurrency, initialCurrencyCode, query.data, onChange]);
	return (
		<Grid.Container gap={1}>
			{query.data.list.map((currency, index) => (
				<React.Fragment key={currency.code}>
					{index === query.data.topAmount && index ? (
						<Card.Divider y={1} />
					) : null}
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
	query: TRPCQueryResult<"currency.get-list">;
};

const CurrenciesPickerLoader: React.FC<LoaderProps> = ({ query, ...props }) => {
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
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
	const query = trpc.useQuery(["currency.get-list", { locale: "en" }], {
		ssr: false,
	});
	React.useEffect(() => {
		if (onLoad && query.status === "success") {
			onLoad(query.data.list);
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
