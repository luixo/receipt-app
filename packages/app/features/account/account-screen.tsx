import React from "react";

import { Button, Loading, Spacer, Text } from "@nextui-org/react";
import { useRouter } from "solito/router";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/mutation-error-message";
import { Page } from "app/components/page";
import { ChangePasswordScreen } from "app/features/change-password/change-password-screen";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { trpc } from "app/trpc";

import { AccountNameInput } from "./account-name-input";
import { AccountPublicNameInput } from "./account-public-name-input";

export const AccountScreen: React.FC = () => {
	const router = useRouter();
	const accountQuery = trpc.useQuery(["account.get"]);

	const trpcContext = trpc.useContext();
	const logoutMutation = trpc.useMutation("account.logout");
	const logout = useAsyncCallback(
		async (isMount) => {
			await logoutMutation.mutateAsync();
			if (!isMount()) {
				return;
			}
			cache.account.get.invalidate(trpcContext, { refetchInactive: true });
			router.replace("/");
		},
		[logoutMutation, trpcContext, router]
	);

	return (
		<Page>
			{/* zero margin because of inherited margin from ChildText */}
			<Text h2 css={{ m: 0 }}>
				{accountQuery.status === "success" ? (
					`👨👩 ${accountQuery.data.name}`
				) : accountQuery.status === "loading" ? (
					<Loading />
				) : (
					"Please read below"
				)}
			</Text>
			{accountQuery.status === "success" ? (
				<>
					<Spacer y={1} />
					<AccountNameInput account={accountQuery.data} />
					<Spacer y={1} />
					<AccountPublicNameInput account={accountQuery.data} />
				</>
			) : null}
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
		</Page>
	);
};
