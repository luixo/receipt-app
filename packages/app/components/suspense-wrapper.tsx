import React from "react";

import {
	QueryErrorResetBoundary,
	useQueryErrorResetBoundary,
} from "@tanstack/react-query";
import type { ErrorRouteComponent } from "@tanstack/react-router";
import { CatchBoundary } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { useTranslation } from "react-i18next";

import { ErrorMessage } from "~app/components/error-message";
import { LinksContext } from "~app/contexts/links-context";

const ErrorComponent: ErrorRouteComponent = ({
	error,
	reset: resetBoundary,
}) => {
	const { t } = useTranslation("default");
	const { reset: resetQuery } = useQueryErrorResetBoundary();
	React.useEffect(() => {
		resetQuery();
	}, [resetQuery]);
	return (
		<ErrorMessage
			message={error.message}
			button={{
				text: t("components.errorMessage.refetch"),
				onPress: resetBoundary,
			}}
		/>
	);
};

export const SuspenseWrapper: React.FC<
	React.PropsWithChildren<{ fallback: React.ReactNode }>
> = ({ children, fallback }) => {
	const { captureError } = React.use(LinksContext);
	return (
		<React.Suspense fallback={fallback}>
			<QueryErrorResetBoundary>
				<CatchBoundary
					getResetKey={() => "static"}
					onCatch={(error) => {
						if (error instanceof TRPCClientError) {
							captureError(error);
						}
						// eslint-disable-next-line no-console
						console.error(`Unknown error`, error);
					}}
					errorComponent={ErrorComponent}
				>
					{children}
				</CatchBoundary>
			</QueryErrorResetBoundary>
		</React.Suspense>
	);
};

export const suspendedFallback =
	<P extends object = Record<string, never>>(
		Component: React.ComponentType<P>,
		Fallback: React.ReactNode | React.FC<P>,
	): React.FC<P> =>
	(props) => (
		<SuspenseWrapper
			fallback={
				typeof Fallback === "function" ? <Fallback {...props} /> : Fallback
			}
		>
			<Component {...props} />
		</SuspenseWrapper>
	);
