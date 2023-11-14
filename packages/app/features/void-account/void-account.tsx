import React from "react";

import { Button, Loading, Spacer, Text, styled } from "@nextui-org/react";

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
				<Text h3>{voidMutation.data.email}</Text>
				<Spacer y={0.5} />
				<Text h4 color="success">
					Account removed succesfully
				</Text>
				<Spacer y={1} />
				<Button auto onClick={navigateToHomePage}>
					To home page
				</Button>
			</>
		);
	}
	return (
		<>
			<Text h3>Are you sure you want to void your account?</Text>
			<Spacer y={1} />
			<Buttons>
				<Button
					onClick={voidAccount}
					disabled={voidMutation.isLoading}
					color="error"
					type="submit"
				>
					{voidMutation.isLoading ? (
						<Loading color="currentColor" size="sm" />
					) : (
						"Yes"
					)}
				</Button>
				<Spacer x={0.5} />
				<Button onClick={navigateToHomePage} disabled={voidMutation.isLoading}>
					No
				</Button>
			</Buttons>
			{voidMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<ErrorMessage message={voidMutation.error.message} />
				</>
			) : null}
		</>
	);
};
