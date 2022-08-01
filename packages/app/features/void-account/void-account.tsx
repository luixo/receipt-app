import React from "react";

import { Button, Loading, Spacer, styled, Text } from "@nextui-org/react";
import { useRouter } from "solito/router";

import { MutationErrorMessage } from "app/components/error-message";
import { TRPCMutationResult } from "app/trpc";

const Buttons = styled("div", {
	display: "flex",
	justifyContent: "center",
});

type Props = {
	token?: string;
	voidMutation: TRPCMutationResult<"auth.void-account">;
};

export const VoidAccount: React.FC<Props> = ({ token, voidMutation }) => {
	const router = useRouter();
	const navigateToHomePage = React.useCallback(
		() => router.replace("/"),
		[router]
	);
	const voidAccount = React.useCallback(() => {
		if (!token) {
			return;
		}
		return voidMutation.mutate({ token });
	}, [voidMutation, token]);
	if (!token) {
		return (
			<>
				<Text h3>Something went wrong</Text>
				<Text b>Please verify you got void account link right</Text>
			</>
		);
	}
	if (voidMutation.status === "loading") {
		return <Loading />;
	}
	if (voidMutation.status === "error") {
		return <MutationErrorMessage mutation={voidMutation} />;
	}
	if (voidMutation.status === "idle") {
		return (
			<>
				<Text h3>Are you sure you want to void your account?</Text>
				<Spacer y={1} />
				<Buttons>
					<Button
						onClick={voidAccount}
						disabled={voidMutation.isLoading}
						color="error"
					>
						{voidMutation.isLoading ? (
							<Loading color="currentColor" size="sm" />
						) : (
							"Yes"
						)}
					</Button>
					<Spacer x={0.5} />
					<Button
						onClick={navigateToHomePage}
						disabled={voidMutation.isLoading}
					>
						No
					</Button>
				</Buttons>
			</>
		);
	}
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
};
