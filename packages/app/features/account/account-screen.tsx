import React from "react";

import { Button, Spacer, Spinner } from "@nextui-org/react-tailwind";
import { useQueryClient } from "@tanstack/react-query";
import { FaUser as AccountIcon } from "react-icons/fa";

import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
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
			<Header icon={<AccountIcon size={36} />} textChildren="My account">
				{query.data.user.name}
			</Header>
			<EmailVerificationCard />
			<Spacer y={4} />
			<AccountNameInput accountQuery={query.data} />
			<Spacer y={4} />
			<ChangePasswordScreen />
			<Spacer y={8} />
			<Button
				isDisabled={logoutMutation.isLoading}
				onClick={logout}
				color="warning"
				isLoading={logoutMutation.isLoading}
				className="self-end"
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
