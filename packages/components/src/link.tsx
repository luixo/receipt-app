import type React from "react";

import { Link as LinkRaw } from "@heroui/link";

import type { UrlParams } from "~app/hooks/use-navigation";
import { buildUrl } from "~app/hooks/use-navigation";

// eslint-disable-next-line react/function-component-definition
export function Link<P extends string>({
	to,
	params,
	search,
	hash,
	...props
}: Omit<React.ComponentProps<typeof LinkRaw>, "href"> & UrlParams<P>) {
	return (
		<LinkRaw
			{...props}
			href={buildUrl({ to, params, search, hash } as UrlParams<P>)}
		/>
	);
}
