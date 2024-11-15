import React from "react";
import { View } from "react-native";

import { ErrorMessage } from "~app/components/error-message";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Header } from "~components/header";
import { Link } from "~components/link";
import { options as authVoidAccountOptions } from "~mutations/auth/void-account";

type Props = {
	token: string;
};

export const VoidAccount: React.FC<Props> = ({ token }) => {
	const voidMutation = trpc.auth.voidAccount.useMutation(
		useTrpcMutationOptions(authVoidAccountOptions),
	);
	const voidAccount = React.useCallback(
		() => voidMutation.mutate({ token }),
		[voidMutation, token],
	);
	if (voidMutation.status === "success") {
		return (
			<>
				<Header>{voidMutation.data.email}</Header>
				<Header size="sm" className="text-success">
					Account removed succesfully
				</Header>
				<Button color="primary" as={Link} href="/login">
					To login page
				</Button>
			</>
		);
	}
	const { isPending } = voidMutation;
	return (
		<>
			<Header>Are you sure you want to void your account?</Header>
			<View className="flex-row gap-2">
				<Button
					className="flex-1"
					onPress={voidAccount}
					isDisabled={isPending}
					isLoading={isPending}
					color="danger"
					type="submit"
				>
					Yes
				</Button>
				<Button
					className="flex-1"
					as={isPending ? undefined : Link}
					href={isPending ? undefined : "/login"}
					color="primary"
					isDisabled={isPending}
				>
					No
				</Button>
			</View>
			{voidMutation.status === "error" ? (
				<ErrorMessage message={voidMutation.error.message} />
			) : null}
		</>
	);
};
