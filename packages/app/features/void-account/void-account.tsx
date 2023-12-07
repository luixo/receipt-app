import React from "react";
import { View } from "react-native";

import { Button } from "@nextui-org/react-tailwind";

import { Text } from "app/components/base/text";
import { ErrorMessage } from "app/components/error-message";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";

type Props = {
	token: string;
};

export const VoidAccount: React.FC<Props> = ({ token }) => {
	const router = useRouter();
	const navigateToHomePage = React.useCallback(
		() => router.replace("/"),
		[router],
	);
	const voidMutation = trpc.auth.voidAccount.useMutation(
		useTrpcMutationOptions(mutations.auth.voidAccount.options),
	);
	const voidAccount = React.useCallback(
		() => voidMutation.mutate({ token }),
		[voidMutation, token],
	);
	if (voidMutation.status === "success") {
		return (
			<View className="gap-4">
				<Text className="text-2xl font-medium">{voidMutation.data.email}</Text>
				<Text className="text-success">Account removed succesfully</Text>
				<Button color="primary" onClick={navigateToHomePage}>
					To home page
				</Button>
			</View>
		);
	}
	return (
		<View className="gap-4">
			<Text className="text-2xl font-medium">
				Are you sure you want to void your account?
			</Text>
			<View className="flex-row gap-2">
				<Button
					onClick={voidAccount}
					isDisabled={voidMutation.isLoading}
					isLoading={voidMutation.isLoading}
					color="danger"
					type="submit"
				>
					Yes
				</Button>
				<Button
					color="primary"
					onClick={navigateToHomePage}
					isDisabled={voidMutation.isLoading}
				>
					No
				</Button>
			</View>
			{voidMutation.status === "error" ? (
				<ErrorMessage message={voidMutation.error.message} />
			) : null}
		</View>
	);
};
