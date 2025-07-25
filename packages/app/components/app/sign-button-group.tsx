import React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

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

export const SkeletonSignButtonGroup = () => {
	const { t } = useTranslation("default");
	return (
		<View className="flex-row">
			<Button
				className={buttonClass({ type: "left" })}
				color="success"
				isDisabled
			>
				{t("components.signButtonGroup.positive")}
			</Button>
			<Button
				variant="bordered"
				className={buttonClass({ type: "right" })}
				color="danger"
				isDisabled
			>
				{t("components.signButtonGroup.negative")}
			</Button>
		</View>
	);
};

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
	const { t } = useTranslation("default");
	const setPositive = React.useCallback(() => onUpdate("+"), [onUpdate]);
	const setNegative = React.useCallback(() => onUpdate("-"), [onUpdate]);
	return (
		<View className="flex-row">
			<Button
				onPress={setPositive}
				variant={direction === "-" ? "bordered" : undefined}
				className={buttonClass({ type: "left" })}
				color="success"
				isDisabled={disabled || isLoading}
			>
				{isLoading ? (
					<Spinner size="sm" />
				) : (
					t("components.signButtonGroup.positive")
				)}
			</Button>
			<Button
				onPress={setNegative}
				variant={direction === "+" ? "bordered" : undefined}
				className={buttonClass({ type: "right" })}
				color="danger"
				isDisabled={disabled || isLoading}
			>
				{isLoading ? (
					<Spinner size="sm" />
				) : (
					t("components.signButtonGroup.negative")
				)}
			</Button>
		</View>
	);
};
