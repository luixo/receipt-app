import React from "react";
import { View } from "react-native";

import {
	Button,
	Divider,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
	Spinner,
} from "@nextui-org/react";

import { QueryErrorMessage } from "~app/components/error-message";
import type { TRPCQueryResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { type CurrencyCode, renderCurrencyName } from "~app/utils/currency";
import { Text } from "~components";
import { MONTH } from "~utils";

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
	const renderedCodes = topCurrencyCodes
		? codes
			? codes.sort(
					(a, b) => topCurrencyCodes.indexOf(b) - topCurrencyCodes.indexOf(a),
			  )
			: topCurrencyCodes
		: codes || [];
	return (
		<View className="flex-row flex-wrap gap-2">
			{renderedCodes.map((currencyCode, index) => (
				<React.Fragment key={currencyCode}>
					{index === cutIndex && index !== 0 ? (
						<Divider className="my-2" />
					) : null}
					<Button
						onClick={() => onChange(currencyCode)}
						variant="flat"
						color={
							currencyCode === selectedCurrencyCode ? "success" : "primary"
						}
						title={currencyCode}
					>
						{renderCurrencyName(
							currencyCode,
							query.data
								? query.data.find(({ code }) => code === currencyCode)
								: undefined,
						)}
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
