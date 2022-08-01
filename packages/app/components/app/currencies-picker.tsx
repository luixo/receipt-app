import React from "react";

import { Button, Card, Grid, Loading, Modal, Text } from "@nextui-org/react";
import { QueryObserverSuccessResult } from "react-query";

import { QueryErrorMessage } from "app/components/error-message";
import { trpc, TRPCError, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";

type CurrencyList = TRPCQueryOutput<"currency.get-list">;
type CurrencyListItem = CurrencyList["list"][number];

type InnerProps = {
	query: QueryObserverSuccessResult<CurrencyList, TRPCError>;
	initialCurrencyCode?: Currency;
	selectedCurrency?: CurrencyListItem;
	onChange: (nextCurrency: CurrencyListItem) => void;
	modalOpen: boolean;
	onModalClose: () => void;
};

const CurrenciesPickerInner: React.FC<InnerProps> = ({
	query,
	selectedCurrency,
	initialCurrencyCode,
	onChange,
	modalOpen,
	onModalClose,
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
				<Grid.Container gap={1} justify="center">
					{query.data.list.map((currency, index) => (
						<React.Fragment key={currency.code}>
							{index === query.data.topAmount && index ? (
								<Card.Divider y={1} />
							) : null}
							<Grid xs>
								<Button
									onClick={() => onChange(currency)}
									auto
									flat
									color={
										currency.code === selectedCurrency?.code
											? "success"
											: undefined
									}
								>
									{currency.name} ({currency.code}
									{currency.code === currency.symbol
										? ""
										: ` / ${currency.symbol}`}
									)
								</Button>
							</Grid>
						</React.Fragment>
					))}
				</Grid.Container>
			</Modal.Body>
		</Modal>
	);
};

type Props = Omit<InnerProps, "query">;

export const CurrenciesPicker: React.FC<Props> = (props) => {
	const query = trpc.useQuery(["currency.get-list", { locale: "en" }], {
		ssr: false,
	});
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
