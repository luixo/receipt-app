import type React from "react";

import { Card, Link as LinkRaw } from "@heroui/react";
import type { RightJoinProps } from "@heroui/react";
import type { RouterOptions } from "@react-types/shared";
import { useRouter } from "@tanstack/react-router";
import type {
	BuildLocationFn,
	RegisteredRouter,
	ValidateNavigateOptions,
} from "@tanstack/router-core";
import { keys, omit, pick } from "remeda";

import { Button } from "~components/button";
import { BackArrow } from "~components/icons";

type RawProps = React.ComponentProps<typeof LinkRaw>;
type NavigationProps<
	O = unknown,
	R extends RegisteredRouter = RegisteredRouter,
> = ValidateNavigateOptions<R, O>;
export type Props<
	O = unknown,
	R extends RegisteredRouter = RegisteredRouter,
> = Omit<RawProps, "href" | "routerOptions"> & NavigationProps<O, R>;

const PROPS_KEYS = {
	from: true,
	to: true,
	search: true,
	params: true,
	hash: true,
	state: true,
	href: true,
	_fromLocation: true,
	mask: true,
	hashScrollIntoView: true,
	replace: true,
	resetScroll: true,
	startTransition: true,
	viewTransition: true,
	ignoreBlocker: true,
	reloadDocument: true,
} satisfies Record<keyof ValidateNavigateOptions, true>;

/* eslint-disable react/function-component-definition */

export function Link<
	O = unknown,
	R extends RegisteredRouter = RegisteredRouter,
>(props: Props<O, R>) {
	const router = useRouter();
	const picked = pick(
		props,
		keys(PROPS_KEYS),
	) as Parameters<BuildLocationFn>[0];
	const omitted = omit(props, keys(PROPS_KEYS));
	return (
		<LinkRaw
			{...omitted}
			href={router.buildLocation(picked).href}
			routerOptions={picked as RouterOptions}
		/>
	);
}

export function BackLink<
	O = unknown,
	R extends RegisteredRouter = RegisteredRouter,
>(props: React.ComponentProps<typeof Link<O, R>>) {
	return (
		// @ts-expect-error This is too complex to represent and that's ok
		<Link<P> data-testid="back-link" color="foreground" {...props}>
			<BackArrow size={36} />
		</Link>
	);
}

export function ButtonLink<
	O = unknown,
	R extends RegisteredRouter = RegisteredRouter,
>(
	props: RightJoinProps<
		Omit<React.ComponentProps<typeof Button>, "as">,
		Props<O, R>
	>,
) {
	// @ts-expect-error This is too complex to represent and that's ok
	return <Button as={Link} {...props} />;
}

export function CardLink<
	O = unknown,
	R extends RegisteredRouter = RegisteredRouter,
>(
	props: RightJoinProps<
		Omit<React.ComponentProps<typeof Card>, "as">,
		Props<O, R>
	>,
) {
	// @ts-expect-error This is too complex to represent and that's ok
	return <Card as={Link} {...props} />;
}

/* eslint-enable react/function-component-definition */
