import React from "react";
import { View } from "react-native";

import { Button } from "~components/button";
import { Spinner } from "~components/spinner";
import { tv } from "~components/utils";

export type Direction = "+" | "-";

const buttonClass = tv({
	base: "flex-1",
	variants: {
		type: {
			right: "rounded-l-none",
			left: "rounded-r-none",
		},
	},
});

type Props = {
	isLoading: boolean;
	disabled?: boolean;
	direction: Direction;
	onUpdate: (direction: Direction) => void;
};

export const SignButtonGroup: React.FC<Props> = ({
	isLoading,
	disabled,
	direction,
	onUpdate,
}) => {
	const setPositive = React.useCallback(() => onUpdate("+"), [onUpdate]);
	const setNegative = React.useCallback(() => onUpdate("-"), [onUpdate]);
	return (
		<View className="flex-row">
			<Button
				onClick={setPositive}
				variant={direction === "-" ? "bordered" : undefined}
				className={buttonClass({ type: "left" })}
				color="success"
				isDisabled={disabled || isLoading}
			>
				{isLoading ? <Spinner size="sm" /> : "+ give"}
			</Button>
			<Button
				onClick={setNegative}
				variant={direction === "+" ? "bordered" : undefined}
				className={buttonClass({ type: "right" })}
				color="danger"
				isDisabled={disabled || isLoading}
			>
				{isLoading ? <Spinner size="sm" /> : "- take"}
			</Button>
		</View>
	);
};
