import React from "react";

import { Button, Loading, styled } from "@nextui-org/react";

export type Direction = "+" | "-";

const Wrapper = styled("div", {
	display: "flex",
});

const ButtonWrapper = styled(Button, {
	flex: 1,
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
		<Wrapper>
			<ButtonWrapper
				onClick={setPositive}
				bordered={direction === "-"}
				css={{ flex: 1, bbrr: 0, btrr: 0 }}
				color="success"
				disabled={disabled || isLoading}
			>
				{isLoading ? <Loading size="xs" /> : "+ give"}
			</ButtonWrapper>
			<ButtonWrapper
				onClick={setNegative}
				bordered={direction === "+"}
				css={{ flex: 1, bblr: 0, btlr: 0 }}
				color="error"
				disabled={disabled || isLoading}
			>
				{isLoading ? <Loading size="xs" /> : "- take"}
			</ButtonWrapper>
		</Wrapper>
	);
};
