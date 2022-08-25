import React from "react";

import { Button, Loading, styled } from "@nextui-org/react";

export type Direction = "+" | "-";

const Wrapper = styled(Button.Group, {
	m: 0,
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
		<Wrapper color="success" animated={false} disabled={disabled || isLoading}>
			<ButtonWrapper onClick={setPositive} bordered={direction === "-"}>
				{isLoading ? <Loading size="xs" /> : "+ give"}
			</ButtonWrapper>
			<ButtonWrapper onClick={setNegative} bordered={direction === "+"}>
				{isLoading ? <Loading size="xs" /> : "- take"}
			</ButtonWrapper>
		</Wrapper>
	);
};
