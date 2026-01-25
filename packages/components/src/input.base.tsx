import type React from "react";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { Icon } from "~components/icons";
import type { InputHandler, Props } from "~components/input";
import { getErrorState, getMutationLoading } from "~components/utils";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";

import { Button } from "./button.web";

export const usePasswordVisibility = ({
	type,
	endContent,
}: {
	type?: React.ComponentProps<"input">["type"];
	endContent?: ViewReactNode;
}) => {
	const [visible, { switchValue: switchVisible }] = useBooleanState();
	return {
		endContent: (
			<View className="flex-row gap-2">
				{endContent}
				{type === "password" ? (
					<Button variant="light" isIconOnly onPress={switchVisible}>
						<Icon name={visible ? "eye-off" : "eye"} className="size-6" />
					</Button>
				) : null}
			</View>
		),
		type: type === "password" && visible ? undefined : type,
	};
};

export const useMutationErrors = ({
	isDisabled,
	color,
	mutation,
	fieldError,
	description,
	continuousMutations,
}: Pick<
	Props,
	| "isDisabled"
	| "color"
	| "mutation"
	| "fieldError"
	| "description"
	| "continuousMutations"
>) => {
	const isMutationLoading = getMutationLoading(mutation);
	const { isWarning, isError, errors } = getErrorState({
		mutation,
		fieldError,
	});
	return {
		isDisabled: continuousMutations ? false : isMutationLoading || isDisabled,
		color: isWarning ? "warning" : isError ? "danger" : color,
		description: errors.join("\n") || description,
	};
};

export const emptyInputHandler: InputHandler = {
	focus: () => {},
	blur: () => {},
};
