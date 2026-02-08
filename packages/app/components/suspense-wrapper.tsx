import React from "react";

import {
	QueryErrorResetBoundary,
	useQueryErrorResetBoundary,
} from "@tanstack/react-query";
import type {
	ErrorComponentProps,
	ErrorRouteComponent,
} from "@tanstack/react-router";
import { CatchBoundary } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ErrorMessage } from "~app/components/error-message";
import { LinksContext } from "~app/contexts/links-context";

export const ErrorComponent: ErrorRouteComponent = ({
	error,
	info,
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
			stack={info?.componentStack}
			button={{
				text: t("components.errorMessage.refetch"),
				onPress: resetBoundary,
			}}
		/>
	);
};

export const SuspenseWrapper: React.FC<
	React.PropsWithChildren<{
		fallback: React.ReactNode;
		errorComponent?: ErrorComponent;
	}>
> = ({ children, fallback, errorComponent }) => {
	const { captureError } = React.use(LinksContext);
	return (
		<React.Suspense fallback={fallback}>
			<QueryErrorResetBoundary>
				<CatchBoundary
					getResetKey={() => "static"}
					onCatch={(error) => {
						captureError(error);
						// eslint-disable-next-line no-console
						console.error(error);
					}}
					errorComponent={errorComponent || ErrorComponent}
				>
					{children}
				</CatchBoundary>
			</QueryErrorResetBoundary>
		</React.Suspense>
	);
};

type ErrorComponent = (props: ErrorComponentProps) => React.ReactNode;

export const suspendedFallback =
	<P extends object = Record<string, never>>(
		Component: React.ComponentType<P>,
		Fallback: React.ReactNode | React.FC<P>,
		errorComponent?: ErrorComponent,
	): React.FC<P> =>
	(props) => (
		<SuspenseWrapper
			fallback={
				typeof Fallback === "function" ? <Fallback {...props} /> : Fallback
			}
			errorComponent={errorComponent}
		>
			<Component {...props} />
		</SuspenseWrapper>
	);
