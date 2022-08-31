import React from "react";

import { Button, Loading, Spacer } from "@nextui-org/react";
import { useRouter } from "solito/router";

import {
	MutationErrorMessage,
	QueryErrorMessage,
} from "app/components/error-message";
import { Header } from "app/components/header";
import { ChangePasswordScreen } from "app/features/change-password/change-password-screen";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { PageWithLayout } from "next-app/types/page";

import { AccountNameInput } from "./account-name-input";

type InnerProps = {
	query: TRPCQuerySuccessResult<"account.get">;
};

const AccountScreenInner: React.FC<InnerProps> = ({ query }) => {
	const router = useRouter();

	const trpcContext = trpc.useContext();
	const logoutMutation = trpc.useMutation("account.logout");
	const logout = useAsyncCallback(
		async (isMount) => {
			await logoutMutation.mutateAsync();
			if (!isMount()) {
				return;
			}
			trpcContext.queryClient.resetQueries();
			router.replace("/");
		},
		[logoutMutation, trpcContext, router]
	);

	return (
		<>
			<Header icon="👤">{query.data.name}</Header>
			<EmailVerificationCard />
			<Spacer y={1} />
			<AccountNameInput account={query.data} />
			<Spacer y={1} />
			<ChangePasswordScreen />
			<Spacer y={2} />
			<Button
				auto
				disabled={logoutMutation.isLoading}
				onClick={logout}
				color="warning"
				css={{ alignSelf: "flex-end" }}
			>
				{logoutMutation.isLoading ? <Loading /> : "Logout"}
			</Button>
			{logoutMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={logoutMutation} />
				</>
			) : null}
		</>
	);
};

export const AccountScreen: PageWithLayout = () => {
	const query = trpc.useQuery(["account.get"]);
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <AccountScreenInner query={query} />;
};
