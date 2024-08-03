import React from "react";

import { Link } from "solito/link";

import { EmptyCard } from "~app/components/empty-card";
import { ErrorMessage } from "~app/components/error-message";
import type { TRPCMutationResult } from "~app/trpc";
import { Button, Header, Spinner } from "~components";

type Props = {
	token?: string;
	confirmMutation: TRPCMutationResult<"auth.confirmEmail">;
};

export const ConfirmEmail: React.FC<Props> = ({ token, confirmMutation }) => {
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
			<Link href="/">
				<Button color="primary">To home page</Button>
			</Link>
		</>
	);
};
