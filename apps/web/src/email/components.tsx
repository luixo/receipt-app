import React, { createContext, use } from "react";

import { Button as RawButton, Link as RawLink } from "@react-email/components";
import { omit } from "remeda";

import type { NavigationOptions, RouteTo } from "~app/utils/navigation";
import { cn } from "~components/utils";
import { buildUrl } from "~utils/server/url";

const buildAbsoluteUrl = <K extends RouteTo>(
	navigate: NavigationOptions<K>,
	baseUrl: string,
) => {
	/* c8 ignore start */
	if (!baseUrl) {
		throw new Error(`Expected to have base url while generating email`);
		/* c8 ignore stop */
	}

	return new URL(buildUrl(navigate), baseUrl).href;
};

export const BaseUrlContext = createContext<string | null>(null);

export const Button: React.FC<
	Omit<React.ComponentProps<typeof RawButton>, "href"> & {
		navigate: NavigationOptions<RouteTo>;
	}
> = ({ className, navigate, ...props }) => (
	<RawButton
		{...props}
		// oxlint-disable-next-line typescript/no-non-null-assertion
		href={buildAbsoluteUrl(navigate, use(BaseUrlContext)!)}
		className={cn(
			"border-brand bg-brand inline-block rounded-md border px-6 py-3 text-sm font-bold text-white capitalize no-underline",
			className,
		)}
	/>
);

export const Link: React.FC<
	Omit<React.ComponentProps<typeof RawLink>, "href"> &
		(
			| {
					navigate: NavigationOptions<RouteTo>;
			  }
			| { href: string }
		)
> = ({ className, ...props }) => (
	<RawLink
		{...omit(props, ["navigate", "href"] as unknown as (keyof typeof props)[])}
		className={cn("text-muted underline", className)}
		href={
			"href" in props
				? props.href
				: // oxlint-disable-next-line typescript/no-non-null-assertion
					buildAbsoluteUrl(props.navigate, use(BaseUrlContext)!)
		}
	/>
);
