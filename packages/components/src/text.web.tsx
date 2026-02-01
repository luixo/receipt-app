import type React from "react";

import { cn } from "@heroui/react";

import {
	ARIA_LEVEL,
	ROLE,
	type TextVariant,
	textVariants,
} from "~components/text.base";

export type MaybeText = string | number | undefined;

export type Props = {
	className?: string;
	children?: MaybeText | MaybeText[];
	variant?: TextVariant;
	testID?: string;
};

export const Text: React.FC<Props> = ({
	className,
	variant = "span",
	testID,
	children,
}) => {
	const Variant = variant;
	return (
		<Variant
			className={cn(textVariants({ variant, className }))}
			data-testid={testID}
			role={ROLE[variant]}
			aria-level={ARIA_LEVEL[variant]}
		>
			{children}
		</Variant>
	);
};
