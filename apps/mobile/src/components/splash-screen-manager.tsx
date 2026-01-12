import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";

import { useMountEffect } from "~app/hooks/use-mount-effect";

void SplashScreen.preventAutoHideAsync();
export const SplashScreenManager: React.FC<{ timeout: number }> = ({
	timeout,
}) => {
	const queryClient = useQueryClient();
	const getSomePending = React.useCallback(
		() =>
			queryClient
				.getQueryCache()
				.getAll()
				.some((query) => query.state.status === "pending"),
		[queryClient],
	);
	const [mounted, setMounted] = React.useState(false);
	useMountEffect(() => setMounted(true));
	const [timedOut, setTimedOut] = React.useState(false);
	useMountEffect(() => {
		const id = setTimeout(() => setTimedOut(true), timeout);
		return () => clearTimeout(id);
	});
	const [hasPending, setHasPending] = React.useState(true);
	React.useEffect(() => {
		if (mounted && (!hasPending || timedOut)) {
			SplashScreen.hide();
			return;
		}
		setHasPending(getSomePending());
		return queryClient
			.getQueryCache()
			.subscribe(() => setHasPending(getSomePending()));
	}, [mounted, hasPending, timedOut, getSomePending, queryClient]);
	return null;
};
