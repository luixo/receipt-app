import React from "react";

import { useTranslation } from "react-i18next";

import { Button } from "~components/button";
import { Spinner } from "~components/spinner";
import { View } from "~components/view";

export type Direction = "+" | "-";

export const SkeletonSignButtonGroup = () => {
	const { t } = useTranslation("default");
	return (
		<View className="flex-row">
			<Button
				className="flex-1 flex-row rounded-r-none"
				color="success"
				isDisabled
			>
				{t("components.signButtonGroup.positive")}
			</Button>
			<Button
				variant="bordered"
				className="flex-1 flex-row rounded-l-none"
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
				className="flex-1 flex-row rounded-r-none"
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
				className="flex-1 flex-row rounded-l-none"
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
