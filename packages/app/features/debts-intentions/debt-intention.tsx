import React from "react";

import { Card, Spacer, styled, Text } from "@nextui-org/react";
import {
	MdSync as SyncIcon,
	MdNavigateNext as ArrowIcon,
} from "react-icons/md";

import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { TRPCQueryOutput } from "app/trpc";
import { formatDate, formatDateTime } from "app/utils/date";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "center",
	gap: "$6",
});

type Intentions = TRPCQueryOutput<"debtsSyncIntentions.getAll">;

type Props = {
	intention: Intentions["outbound"][number] | Intentions["inbound"][number];
	children?: React.ReactNode;
};

export const DebtIntention: React.FC<Props> = ({ intention, children }) => {
	const currency = useFormattedCurrency(intention.currencyCode);
	const renderChildrenInline = useMatchMediaValue(true, { lessSm: false });
	const intentionDataComponent = (
		<Wrapper>
			<Text color={intention.amount >= 0 ? "success" : "error"}>
				{Math.abs(intention.amount)} {currency}
			</Text>
			<Text>{formatDate(intention.timestamp)}</Text>
		</Wrapper>
	);
	return (
		<Card>
			<Card.Body>
				{"current" in intention && intention.current ? (
					<Wrapper>
						<Wrapper>
							<Text color={intention.current.amount >= 0 ? "success" : "error"}>
								{Math.abs(intention.current.amount)} {currency}
							</Text>
							<Text>{formatDate(intention.current.timestamp)}</Text>
						</Wrapper>
						<ArrowIcon size={24} />
						{intentionDataComponent}
					</Wrapper>
				) : (
					intentionDataComponent
				)}
				<Spacer y={0.25} />
				<Text>{intention.note}</Text>
				<Spacer y={0.5} />
				<Wrapper css={{ justifyContent: "space-between" }}>
					<Wrapper>
						<SyncIcon size={24} />
						<Text>{formatDateTime(intention.intentionTimestamp)}</Text>
					</Wrapper>
					{renderChildrenInline ? children : null}
				</Wrapper>
				{renderChildrenInline ? null : children}
			</Card.Body>
		</Card>
	);
};
