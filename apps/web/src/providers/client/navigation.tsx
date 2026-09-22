import type React from "react";

import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "@tanstack/react-router";

export const NavigationProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const router = useRouter();
	return (
		<HeroUIProvider
			navigate={(href, options) => {
				void router.navigate(options ?? { to: ".", href });
			}}
			useHref={(href) => router.buildLocation({ to: href }).href}
			validationBehavior="native"
			disableAnimation={import.meta.env.MODE === "test"}
			disableRipple={import.meta.env.MODE === "test"}
			className="h-full"
		>
			{children}
		</HeroUIProvider>
	);
};
