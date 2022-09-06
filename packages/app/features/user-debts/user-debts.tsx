import React from "react";

import { Loading, Spacer, Card } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";
import { useRouter } from "solito/router";

import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { Currency } from "app/utils/currency";
import { UsersId } from "next-app/src/db/models";

import { UserDebtPreview } from "./user-debt-preview";

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getUser">;
};

export const UserDebtsInner: React.FC<InnerProps> = ({ userId, query }) => {
	const debts = query.data;
	const router = useRouter();
	React.useEffect(() => {
		if (debts.length === 0) {
			router.replace("/debts");
		}
	}, [debts, router]);
	const aggregatedDebts = React.useMemo(
		() =>
			Object.entries(
				debts.reduce<Record<Currency, number>>((acc, debt) => {
					if (!acc[debt.currency]) {
						acc[debt.currency] = 0;
					}
					acc[debt.currency] += debt.amount;
					return acc;
				}, {})
			).map(([currency, sum]) => ({ currency, sum })),
		[debts]
	);
	return (
		<>
			<Header
				backHref="/debts"
				aside={
					<IconButton
						key="add"
						href={`/debts/add?userId=${userId}`}
						title="Add debt"
						bordered
						icon={<AddIcon size={24} />}
					/>
				}
			>
				<LoadableUser id={userId} />
			</Header>
			<Spacer y={1} />
			<DebtsGroup debts={aggregatedDebts} css={{ alignSelf: "center" }} />
			<Spacer y={1} />
			{debts.map((debt) => (
				<React.Fragment key={debt.id}>
					<Card.Divider />
					<UserDebtPreview debt={debt} />
				</React.Fragment>
			))}
		</>
	);
};

type Props = Omit<InnerProps, "query">;

export const UserDebts: React.FC<Props> = ({ userId, ...props }) => {
	const query = trpc.debts.getUser.useQuery({ userId });
	const userNameQuery = trpc.users.getName.useQuery({ id: userId });
	if (query.status === "loading") {
		return (
			<>
				<Header>{userNameQuery.data || userId}</Header>
				<Loading />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <UserDebtsInner {...props} query={query} userId={userId} />;
};
