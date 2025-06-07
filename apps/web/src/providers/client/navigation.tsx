import React from "react";

import {
	useHref as useHrefFactory,
	useNavigate,
} from "~app/hooks/use-navigation";
import { HeroUIProvider } from "~components/utils";

export const NavigationProvider: React.FC<React.PropsWithChildren<object>> = ({
	children,
}) => {
	const navigate = useNavigate();
	const useHref = useHrefFactory();
	const localNavigate = React.useCallback<
		NonNullable<React.ComponentProps<typeof HeroUIProvider>["navigate"]>
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	>((_href, options) => navigate(options!), [navigate]);
	return (
		<HeroUIProvider
			navigate={localNavigate}
			useHref={useHref}
			validationBehavior="native"
		>
			{children}
		</HeroUIProvider>
	);
};
