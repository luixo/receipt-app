import React from "react";

import { Container, Loading, Spacer, Text, styled } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { DebtsGroup } from "app/components/app/debts-group";
import { QueryErrorMessage } from "app/components/error-message";
import { IconButton } from "app/components/icon-button";
import { ShowResolvedDebtsOption } from "app/features/settings/show-resolved-debts-option";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";

import { UserDebtsPreview } from "./user-debts-preview";

const NoDebtsHint = styled(Text, {
	display: "flex",
	alignItems: "center",
});

const DebtsHeader = styled("div", {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
});

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.getByUsers">;
};

const DebtsInner: React.FC<InnerProps> = ({ query }) => {
	const debtEntries = query.data;

	const sums = React.useMemo(
		() =>
			Object.entries(
				debtEntries.reduce<Record<string, number>>((acc, { debts }) => {
					debts.forEach(({ currencyCode, sum }) => {
						acc[currencyCode] = (acc[currencyCode] || 0) + sum;
					});
					return acc;
				}, {})
			).map(([currencyCode, sum]) => ({ currencyCode, sum })),
		[debtEntries]
	);
	const [showResolvedDebts] = useShowResolvedDebts();

	if (debtEntries.length === 0) {
		return (
			<Container
				display="flex"
				direction="column"
				alignItems="center"
				justify="center"
			>
				<Text h2>You have no debts</Text>
				<Spacer y={0.5} />
				<NoDebtsHint h3>
					Press
					<Spacer x={0.5} />
					<IconButton
						href="/debts/add"
						title="Add debt"
						bordered
						icon={<AddIcon size={24} />}
					/>{" "}
					<Spacer x={0.5} />
					to add a debt
				</NoDebtsHint>
			</Container>
		);
	}

	const filteredDebtsEntries = showResolvedDebts
		? debtEntries
		: debtEntries.filter((entry) => entry.debts.some((debt) => debt.sum !== 0));
	return (
		<>
			<DebtsHeader>
				<DebtsGroup
					debts={sums}
					css={{ p: "$4", flexWrap: "wrap", alignItems: "center" }}
				/>
				{debtEntries.every((entry) =>
					entry.debts.every((debt) => debt.sum !== 0)
				) ? null : (
					<ShowResolvedDebtsOption />
				)}
			</DebtsHeader>
			<Spacer y={1} />
			{filteredDebtsEntries.map(({ userId, debts }, index) => (
				<React.Fragment key={userId}>
					{index === 0 ? null : <Spacer y={0.5} />}
					<UserDebtsPreview
						debts={debts}
						userId={userId}
						transparent={debts.every((debt) => debt.sum === 0)}
					/>
				</React.Fragment>
			))}
		</>
	);
};

export const Debts: React.FC = () => {
	const query = trpc.debts.getByUsers.useQuery();
	if (query.status === "loading") {
		return <Loading size="xl" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsInner query={query} />;
};
