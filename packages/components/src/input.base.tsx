import type React from "react";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import type { InputHandler, Props } from "~components/input";
import { getErrorState, getMutationLoading } from "~components/utils";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";

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
					<Button variant="ghost" isIconOnly onPress={switchVisible}>
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
	mutation,
	fieldError,
	description,
	continuousMutations,
}: Pick<
	Props,
	| "isDisabled"
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
		description: errors.join("\n") || description,
		className: isWarning ? "bg-warning" : isError ? "bg-danger" : undefined,
	};
};

export const emptyInputHandler: InputHandler = {
	focus: () => {
		/* empty */
	},
	blur: () => {
		/* empty */
	},
};
