import React from "react";

import { Button, Loading, Spacer, Text } from "@nextui-org/react";
import { useRouter } from "solito/router";

import { MutationErrorMessage } from "app/components/mutation-error-message";
import { Page } from "app/components/page";
import { ChangePasswordScreen } from "app/features/change-password/change-password-screen";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { trpc } from "app/trpc";

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
			trpcContext.invalidateQueries(["account.get"]);
			trpcContext.refetchQueries(["account.get"]);
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
