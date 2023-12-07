import React from "react";

import { styled } from "@nextui-org/react";
import { Button, Spacer } from "@nextui-org/react-tailwind";

import { Text } from "app/components/base/text";
import { ErrorMessage } from "app/components/error-message";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";

const Buttons = styled("div", {
	display: "flex",
	justifyContent: "center",
});

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
			<>
				<Text className="text-2xl font-medium">{voidMutation.data.email}</Text>
				<Spacer y={2} />
				<Text className="text-success">Account removed succesfully</Text>
				<Spacer y={4} />
				<Button color="primary" onClick={navigateToHomePage}>
					To home page
				</Button>
			</>
		);
	}
	return (
		<>
			<Text className="text-2xl font-medium">
				Are you sure you want to void your account?
			</Text>
			<Spacer y={4} />
			<Buttons>
				<Button
					onClick={voidAccount}
					isDisabled={voidMutation.isLoading}
					isLoading={voidMutation.isLoading}
					color="danger"
					type="submit"
				>
					Yes
				</Button>
				<Spacer x={2} />
				<Button
					color="primary"
					onClick={navigateToHomePage}
					isDisabled={voidMutation.isLoading}
				>
					No
				</Button>
			</Buttons>
			{voidMutation.status === "error" ? (
				<>
					<Spacer y={4} />
					<ErrorMessage message={voidMutation.error.message} />
				</>
			) : null}
		</>
	);
};
