import React from "react";

import { Spacer, Card, styled } from "@nextui-org/react";

import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { Link } from "app/components/link";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { useTrpcQueryOptions } from "app/hooks/use-trpc-query-options";
import { queries } from "app/queries";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

const CardWrapper = styled(Card, {
	variants: {
		transparent: {
			true: {
				opacity: 0.5,
			},
		},
	},
});

type Props = {
	debts: TRPCQueryOutput<"debts.getByUsers">[number]["debts"];
	userId: UsersId;
	transparent: boolean;
};

export const UserDebtsPreview: React.FC<Props> = ({
	debts,
	userId,
	transparent,
}) => {
	trpc.users.get.useQuery(
		{ id: userId },
		useTrpcQueryOptions(queries.users.get.options),
	);
	const showHorizontal = useMatchMediaValue(true, { lessMd: false });
	return (
		<CardWrapper transparent={transparent}>
			<Link href={`/debts/user/${userId}`} color="text">
				<Card.Body
					css={{
						flexDirection: showHorizontal ? "row" : "column",
						alignItems: showHorizontal ? "center" : undefined,
						justifyContent: "space-between",
					}}
				>
					<LoadableUser id={userId} />
					<Spacer y={1} />
					<DebtsGroup debts={debts} />
				</Card.Body>
			</Link>
		</CardWrapper>
	);
};
