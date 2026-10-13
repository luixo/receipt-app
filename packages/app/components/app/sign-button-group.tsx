import React from "react";

import { useTranslation } from "react-i18next";

import { Button, ButtonGroup } from "~components/button";
import { Spinner } from "~components/spinner";

export type Direction = "+" | "-";

export const SkeletonSignButtonGroup = () => {
	const { t } = useTranslation("default");
	return (
		<ButtonGroup className="flex-row" testID="sign-button-group">
			<Button className="bg-success text-success-foreground flex-1" isDisabled>
				{t("components.signButtonGroup.positive")}
			</Button>
			<Button className="bg-danger text-danger-foreground flex-1" isDisabled>
				{t("components.signButtonGroup.negative")}
			</Button>
		</ButtonGroup>
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
		<ButtonGroup className="flex-row" testID="sign-button-group">
			<Button
				testID="sign-button-positive"
				onPress={setPositive}
				variant={direction === "-" ? "outline" : "ghost"}
				className="bg-success text-success-foreground flex-1"
				isDisabled={disabled || isLoading}
			>
				{isLoading ? (
					<Spinner size="sm" />
				) : (
					t("components.signButtonGroup.positive")
				)}
			</Button>
			<Button
				testID="sign-button-negative"
				onPress={setNegative}
				variant={direction === "+" ? "outline" : "ghost"}
				className="bg-danger text-danger-foreground flex-1"
				isDisabled={disabled || isLoading}
			>
				{isLoading ? (
					<Spinner size="sm" />
				) : (
					t("components.signButtonGroup.negative")
				)}
			</Button>
		</ButtonGroup>
	);
};
