import type React from "react";

import { useRouter } from "@tanstack/react-router";

import { HeroUIProvider } from "~components/utils";

export const NavigationProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const router = useRouter();
	return (
		<HeroUIProvider
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			navigate={(_href, options) => router.navigate(options!)}
			useHref={(href) => router.buildLocation({ to: href }).href}
			validationBehavior="native"
		>
			{children}
		</HeroUIProvider>
	);
};
