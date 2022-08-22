import React from "react";

import { Container, Loading, Spacer, Text, styled } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { QueryErrorMessage } from "app/components/error-message";
import { IconButton } from "app/components/icon-button";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";

import { UserDebtsPreview } from "./user-debts-preview";

const NoDebtsHint = styled(Text, {
	display: "flex",
	alignItems: "center",
});

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.get-by-users">;
};

const DebtsInner: React.FC<InnerProps> = ({ query }) => {
	const debtEntries = Object.entries(query.data);

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
						disabled
						icon={<AddIcon size={24} />}
					/>{" "}
					<Spacer x={0.5} />
					to add a debt
				</NoDebtsHint>
			</Container>
		);
	}

	return (
		<>
			{debtEntries.map(([userId, userDebts], index) => (
				<React.Fragment key={userId}>
					{index === 0 ? null : <Spacer y={0.5} />}
					<UserDebtsPreview debts={userDebts} userId={userId} />
				</React.Fragment>
			))}
		</>
	);
};

export const Debts: React.FC = () => {
	const query = trpc.useQuery(["debts.get-by-users"]);
	if (query.status === "loading") {
		return <Loading size="xl" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <DebtsInner query={query} />;
};
