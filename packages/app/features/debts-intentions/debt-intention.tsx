import React from "react";

import { Spacer, Text, styled } from "@nextui-org/react";
import { Card, CardBody } from "@nextui-org/react-tailwind";
import {
	MdNavigateNext as ArrowIcon,
	MdSync as SyncIcon,
} from "react-icons/md";

import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useSsrFormat } from "app/hooks/use-ssr-format";
import type { TRPCQueryOutput } from "app/trpc";

const Wrapper = styled("div", {
	display: "flex",
	alignItems: "center",
	gap: "$6",
});

type Intentions = TRPCQueryOutput<"debts.getIntentions">;

type Props = {
	intention: Intentions[number];
	children?: React.ReactNode;
};

export const DebtIntention = React.forwardRef<HTMLDivElement, Props>(
	({ intention, children }, ref) => {
		const { formatDate, formatDateTime } = useSsrFormat();
		const currency = useFormattedCurrency(intention.currencyCode);
		const selfCurrency = useFormattedCurrency(intention.current?.currencyCode);
		const intentionDataComponent = (
			<Wrapper>
				<Text color={intention.amount >= 0 ? "success" : "error"}>
					{Math.abs(intention.amount)} {currency}
				</Text>
				<Text>{formatDate(intention.timestamp)}</Text>
			</Wrapper>
		);
		return (
			<Card ref={ref}>
				<CardBody>
					{intention.current ? (
						<Wrapper>
							<Wrapper>
								<Text
									color={intention.current.amount >= 0 ? "success" : "error"}
								>
									{Math.abs(intention.current.amount)} {selfCurrency}
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
							<Text>{formatDateTime(intention.lockedTimestamp)}</Text>
						</Wrapper>
						<div className="max-md:hidden">{children}</div>
					</Wrapper>
					<div className="self-end md:hidden">{children}</div>
				</CardBody>
			</Card>
		);
	},
);
