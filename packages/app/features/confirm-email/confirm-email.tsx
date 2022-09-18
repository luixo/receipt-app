import React from "react";

import { Button, Loading, Text } from "@nextui-org/react";

import { MutationErrorMessage } from "app/components/error-message";
import { useRouter } from "app/hooks/use-router";
import { TRPCMutationResult } from "app/trpc";

type Props = {
	token?: string;
	confirmMutation: TRPCMutationResult<"auth.confirmEmail">;
};

export const ConfirmEmail: React.FC<Props> = ({ token, confirmMutation }) => {
	const router = useRouter();
	const navigateToHomePage = React.useCallback(
		() => router.replace("/"),
		[router]
	);
	if (!token) {
		return (
			<>
				<Text h3>Something went wrong</Text>
				<Text b>Please verify you got confirm link right</Text>
			</>
		);
	}
	if (confirmMutation.status === "loading") {
		return <Loading />;
	}
	if (confirmMutation.status === "error") {
		return <MutationErrorMessage mutation={confirmMutation} />;
	}
	if (confirmMutation.status === "idle") {
		return null;
	}
	return (
		<>
			<Text h3>{confirmMutation.data.email}</Text>
			<Text h4 color="success">
				Email verification successful!
			</Text>
			<Button onClick={navigateToHomePage}>To home page</Button>
		</>
	);
};
