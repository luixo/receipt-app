import React from "react";

import { useRouter } from "solito/navigation";

import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { ChangePasswordScreen } from "~app/features/change-password/change-password-screen";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput, TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { noBatchContext } from "~app/utils/trpc";
import { userNameSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { AccountIcon } from "~components/icons";
import { Input } from "~components/input";
import { Spinner } from "~components/spinner";
import { options as accountChangeNameOptions } from "~mutations/account/change-name";
import { options as accountLogoutOptions } from "~mutations/account/logout";
import type { AppPage } from "~utils/next";

import { AccountAvatarInput } from "./account-avatar-input";

type NameProps = {
	accountQuery: TRPCQueryOutput<"account.get">;
};

const AccountNameInput: React.FC<NameProps> = ({ accountQuery }) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: accountQuery.user.name,
		schema: userNameSchema,
	});

	const updateNameMutation = trpc.account.changeName.useMutation(
		useTrpcMutationOptions(accountChangeNameOptions, {
			context: { id: accountQuery.account.id },
		}),
	);
	const saveName = React.useCallback(
		(nextName: string) => {
			if (nextName === accountQuery.user.name) {
				return;
			}
			updateNameMutation.mutate(
				{ name: nextName },
				{ onSuccess: () => setValue(nextName) },
			);
		},
		[updateNameMutation, accountQuery.user.name, setValue],
	);

	return (
		<Input
			{...bindings}
			label="Your name in the receipts"
			mutation={updateNameMutation}
			fieldError={inputState.error}
			saveProps={{
				title: "Save name",
				isHidden: accountQuery.user.name === getValue(),
				onPress: () => saveName(getValue()),
			}}
		/>
	);
};

type InnerProps = {
	query: TRPCQuerySuccessResult<"account.get">;
};

const AccountScreenInner: React.FC<InnerProps> = ({ query }) => {
	const router = useRouter();

	const logoutMutation = trpc.account.logout.useMutation(
		useTrpcMutationOptions(accountLogoutOptions, {
			onSuccess: () => router.replace("/"),
			trpc: { context: noBatchContext },
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
			<AccountAvatarInput account={query.data.account}>
				<AccountNameInput accountQuery={query.data} />
			</AccountAvatarInput>
			<ChangePasswordScreen />
			<Button
				className="mt-4 self-end"
				isDisabled={logoutMutation.isPending}
				onPress={logout}
				color="warning"
				isLoading={logoutMutation.isPending}
			>
				Logout
			</Button>
		</>
	);
};

export const AccountScreen: AppPage = () => {
	const query = trpc.account.get.useQuery();
	if (query.status === "pending") {
		return <Spinner />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <AccountScreenInner query={query} />;
};
