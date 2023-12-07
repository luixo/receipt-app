import React from "react";

import { Button, Spinner } from "@nextui-org/react-tailwind";

import { Text } from "app/components/base/text";
import { ErrorMessage } from "app/components/error-message";
import { useRouter } from "app/hooks/use-router";
import type { TRPCMutationResult } from "app/trpc";

type Props = {
	token?: string;
	confirmMutation: TRPCMutationResult<"auth.confirmEmail">;
};

export const ConfirmEmail: React.FC<Props> = ({ token, confirmMutation }) => {
	const router = useRouter();
	const navigateToHomePage = React.useCallback(
		() => router.replace("/"),
		[router],
	);
	if (!token) {
		return (
			<>
				<Text className="text-2xl font-medium">Something went wrong</Text>
				<Text>Please verify you got confirm link right</Text>
			</>
		);
	}
	if (confirmMutation.status === "loading") {
		return <Spinner />;
	}
	if (confirmMutation.status === "error") {
		return <ErrorMessage message={confirmMutation.error.message} />;
	}
	if (confirmMutation.status === "idle") {
		return null;
	}
	return (
		<>
			<Text className="text-2xl font-medium">{confirmMutation.data.email}</Text>
			<Text className="text-success text-lg">
				Email verification successful!
			</Text>
			<Button color="primary" onClick={navigateToHomePage}>
				To home page
			</Button>
		</>
	);
};
