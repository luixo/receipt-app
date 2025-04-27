import type React from "react";

import { ErrorMessage } from "~app/components/error-message";
import type { TRPCMutationResult } from "~app/trpc";
import { Button } from "~components/button";
import { Header } from "~components/header";
import { Link } from "~components/link";
import { Spinner } from "~components/spinner";

type Props = {
	confirmMutation: TRPCMutationResult<"auth.confirmEmail">;
};

export const ConfirmEmail: React.FC<Props> = ({ confirmMutation }) => {
	switch (confirmMutation.status) {
		case "pending":
			return <Spinner size="lg" />;
		case "error":
			return <ErrorMessage message={confirmMutation.error.message} />;
		case "idle":
			return null;
		case "success":
			return (
				<>
					<Header>{confirmMutation.data.email}</Header>
					<Header size="sm">Email verification successful!</Header>
					<Link href="/">
						<Button color="primary">To home page</Button>
					</Link>
				</>
			);
	}
};
