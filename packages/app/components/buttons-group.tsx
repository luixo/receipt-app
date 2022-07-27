import React from "react";

import { Button, Spacer, styled } from "@nextui-org/react";

const Wrapper = styled("div", {
	display: "flex",

	variants: {
		type: {
			linear: {
				flexWrap: "nowrap",
				overflowX: "scroll",
			},
			block: {
				flexWrap: "wrap",
			},
		},
	},
});

type ButtonProps = React.ComponentProps<typeof Button>;

type Props<T> = {
	type: "linear" | "block";
	buttons: T[];
	extractDetails: (input: T) => { id: React.Key; name: string };
	buttonProps?: ButtonProps | ((value: T) => ButtonProps);
	onClick?: (value: T) => void;
	noSpacer?: boolean;
	children?: React.ReactElement | null;
} & Omit<React.ComponentProps<typeof Wrapper>, "children" | "onClick">;

export const ButtonsGroup = <T,>({
	buttons,
	extractDetails,
	buttonProps,
	onClick,
	noSpacer,
	children,
	type,
	...props
}: Props<T>) => (
	<Wrapper {...props} type={type}>
		{buttons.map((button, index) => {
			const { id, name } = extractDetails(button);
			const evaluatedButtonProps =
				typeof buttonProps === "function" ? buttonProps(button) : buttonProps;
			return (
				<React.Fragment key={id}>
					{index === 0 || noSpacer ? null : <Spacer x={0.25} />}
					<Button
						{...evaluatedButtonProps}
						onClick={() => onClick?.(button)}
						css={
							type === "linear"
								? evaluatedButtonProps?.css
								: { mr: "$2", mb: "$4", ...evaluatedButtonProps?.css }
						}
					>
						{name}
					</Button>
				</React.Fragment>
			);
		})}
		{children ? (
			<>
				{type === "linear" ? <Spacer x={0.5} /> : null}
				{children}
			</>
		) : (
			children
		)}
	</Wrapper>
);
