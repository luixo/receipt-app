import React from "react";

import { Button, Spinner } from "@nextui-org/react";

import { Header } from "app/components/base/header";
import { EmptyCard } from "app/components/empty-card";
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
			<EmptyCard title="Something went wrong">
				Please verify you got confirm link right
			</EmptyCard>
		);
	}
	if (confirmMutation.status === "pending") {
		return <Spinner size="lg" />;
	}
	if (confirmMutation.status === "error") {
		return <ErrorMessage message={confirmMutation.error.message} />;
	}
	if (confirmMutation.status === "idle") {
		return null;
	}
	return (
		<>
			<Header>{confirmMutation.data.email}</Header>
			<Header size="sm">Email verification successful!</Header>
			<Button color="primary" onClick={navigateToHomePage}>
				To home page
			</Button>
		</>
	);
};
