import React from "react";

import { Button, Spinner } from "@nextui-org/react";
import { useQueryClient } from "@tanstack/react-query";
import { FaUser as AccountIcon } from "react-icons/fa";

import { QueryErrorMessage } from "app/components/error-message";
import { PageHeader } from "app/components/page-header";
import { ChangePasswordScreen } from "app/features/change-password/change-password-screen";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { AppPage } from "next-app/types/page";

import { AccountNameInput } from "./account-name-input";

type InnerProps = {
	query: TRPCQuerySuccessResult<"account.get">;
};

const AccountScreenInner: React.FC<InnerProps> = ({ query }) => {
	const router = useRouter();

	const queryClient = useQueryClient();
	const logoutMutation = trpc.account.logout.useMutation(
		useTrpcMutationOptions(mutations.account.logout.options, {
			onSuccess: async () => {
				await queryClient.resetQueries();
				void router.replace("/");
			},
		}),
	);
	const logout = React.useCallback(
		() => logoutMutation.mutate(),
		[logoutMutation],
	);

	return (
		<>
			<PageHeader startContent={<AccountIcon size={36} />} title="My account">
				{query.data.user.name}
			</PageHeader>
			<EmailVerificationCard />
			<AccountNameInput accountQuery={query.data} />
			<ChangePasswordScreen />
			<Button
				className="mt-4 self-end"
				isDisabled={logoutMutation.isLoading}
				onClick={logout}
				color="warning"
				isLoading={logoutMutation.isLoading}
			>
				Logout
			</Button>
		</>
	);
};

export const AccountScreen: AppPage = () => {
	const query = trpc.account.get.useQuery();
	if (query.status === "loading") {
		return <Spinner />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <AccountScreenInner query={query} />;
};
