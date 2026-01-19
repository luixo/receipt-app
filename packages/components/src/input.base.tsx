import type React from "react";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { Icon } from "~components/icons";
import type { Props } from "~components/input";
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
					<Button variant="light" isIconOnly>
						<Icon
							onClick={switchVisible}
							name={visible ? "eye-off" : "eye"}
							className="size-6"
						/>
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
}: Pick<
	Props,
	"isDisabled" | "color" | "mutation" | "fieldError" | "description"
>) => {
	const isMutationLoading = getMutationLoading(mutation);
	const { isWarning, isError, errors } = getErrorState({
		mutation,
		fieldError,
	});
	return {
		isDisabled: isMutationLoading || isDisabled,
		color: isWarning ? "warning" : isError ? "danger" : color,
		description: errors.join("\n") || description,
	};
};
