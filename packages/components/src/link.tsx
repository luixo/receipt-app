import type React from "react";

import { Link as LinkRaw } from "@heroui/link";
import type { Card, RightJoinProps } from "@heroui/react";
import type { RouterOptions } from "@react-types/shared";
import { keys, omit, pick } from "remeda";

import {
	type ExistingPath,
	type UrlParams,
	buildUrl,
} from "~app/hooks/use-navigation";
import { BackArrow } from "~components/icons";

import { Button } from "./button";

type RawProps = React.ComponentProps<typeof LinkRaw>;
export type Props<P extends ExistingPath> = Omit<
	RawProps,
	"href" | "routerOptions"
> &
	UrlParams<P>;

const PROPS_KEYS = {
	to: true,
	search: true,
	params: true,
	hash: true,
} satisfies Partial<Record<keyof UrlParams<ExistingPath>, true>>;

const extractProps = <P extends ExistingPath>(
	props: Props<P>,
): [Omit<Props<P>, keyof UrlParams<P>>, RouterOptions] => {
	const picked = pick(props, keys(PROPS_KEYS)) as RouterOptions;
	const omitted = omit(props, keys(PROPS_KEYS));
	return [omitted, picked];
};

/* eslint-disable react/function-component-definition */

export function Link<P extends ExistingPath>(props: Props<P>) {
	const [omitted, picked] = extractProps(props);
	return (
		<LinkRaw {...omitted} href={buildUrl(picked)} routerOptions={picked} />
	);
}

export function BackLink<P extends ExistingPath>(
	props: React.ComponentProps<typeof Link<P>>,
) {
	return (
		<Link<P> data-testid="back-link" color="foreground" {...props}>
			<BackArrow size={36} />
		</Link>
	);
}

export function ButtonLink<P extends ExistingPath>(
	props: RightJoinProps<
		Omit<React.ComponentProps<typeof Button>, "as">,
		Props<P>
	>,
) {
	// @ts-expect-error This is too complex to represent and that's ok
	return <Button as={Link} {...props} />;
}

export function CardLink<P extends ExistingPath>(
	props: RightJoinProps<
		Omit<React.ComponentProps<typeof Card>, "as">,
		Props<P>
	>,
) {
	// @ts-expect-error This is too complex to represent and that's ok
	return <Card as={Link} {...props} />;
}

/* eslint-enable react/function-component-definition */
