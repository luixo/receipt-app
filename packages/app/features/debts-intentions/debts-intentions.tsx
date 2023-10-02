import React from "react";

import { Container, Loading, Spacer, Text, styled } from "@nextui-org/react";
import { useRouter } from "next/router";

import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { useRefs } from "app/hooks/use-refs";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { UsersId } from "next-app/db/models";

import { AcceptAllIntentionsButton } from "./accept-all-intentions-button";
import { InboundDebtIntention } from "./inbound-debt-intention";

const CenteredText = styled(Text, {
	display: "flex",
	alignItems: "center",
});

type IntentionsQuery = TRPCQuerySuccessResult<"debts.getIntentions">;

type Props = {
	query: IntentionsQuery;
};

const DebtIntentionsInner: React.FC<Props> = ({ query: { data } }) => {
	const intentionsRefs = useRefs<HTMLDivElement>();
	const router = useRouter();
	React.useEffect(() => {
		const hash = router.asPath.split("#")[1];
		if (hash) {
			const matchedIntention = data.find((intention) => intention.id === hash);
			if (matchedIntention && intentionsRefs.current[hash]) {
				intentionsRefs.current[hash]?.scrollIntoView();
			}
		}
	}, [data, router.asPath, intentionsRefs]);
	if (data.length === 0) {
		return (
			<Container
				display="flex"
				direction="column"
				alignItems="center"
				justify="center"
			>
				<Text h2>You have no incoming sync requests</Text>
				<Spacer y={1} />
				<CenteredText h3>Ask a friend to create a debt for you ;)</CenteredText>
			</Container>
		);
	}
	const intentionsByUser = data.reduce<
		Record<UsersId, IntentionsQuery["data"]>
	>((acc, intention) => {
		if (!acc[intention.userId]) {
			acc[intention.userId] = [];
		}
		acc[intention.userId]!.push(intention);
		return acc;
	}, {});
	return (
		<>
			<Text h2>Inbound debts</Text>
			<Spacer y={0.5} />
			{data.length === 1 ? null : (
				<>
					<AcceptAllIntentionsButton intentions={data} />
					<Spacer y={1} />
				</>
			)}
			{Object.entries(intentionsByUser).map(
				([userId, groupedIntentions], index) => (
					<React.Fragment key={userId}>
						{index === 0 ? null : <Spacer y={1.5} />}
						<LoadableUser id={userId} />
						{groupedIntentions.map((intention) => (
							<React.Fragment key={intention.id}>
								<Spacer y={1} />
								<InboundDebtIntention
									intention={intention}
									ref={intentionsRefs.setRef(intention.id)}
								/>
							</React.Fragment>
						))}
					</React.Fragment>
				),
			)}
		</>
	);
};

export const DebtIntentions: React.FC = () => {
	const query = trpc.debts.getIntentions.useQuery();
	if (query.status === "loading") {
		return <Loading size="xl" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtIntentionsInner query={query} />;
};
