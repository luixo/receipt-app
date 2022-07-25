import React from "react";

import { styled } from "@nextui-org/react";

import { useWindowSize } from "app/hooks/use-window-size";

const StyledSpan = styled("span");

type Props = {
	min: number;
	step?: number;
};

export const ShrinkText: React.FC<
	React.ComponentProps<typeof StyledSpan> & Props
> = ({ min, step = 2, ...props }) => {
	const ref = React.useRef<HTMLSpanElement>(null);
	const [fontSize, setFontSize] = React.useState<number | undefined>();
	const windowSize = useWindowSize();
	React.useLayoutEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}
		const computedStyle = window.getComputedStyle(element);
		element.style.fontSize = "inherit";
		let currentFontSize =
			parseInt(computedStyle.getPropertyValue("font-size"), 10) + step;
		const currentHeights = { element: 0, line: 0 };
		do {
			currentHeights.element = parseInt(
				computedStyle.getPropertyValue("height"),
				10
			);
			currentHeights.line = parseInt(
				computedStyle.getPropertyValue("line-height"),
				10
			);
			currentFontSize -= step;
			element.style.fontSize = `${currentFontSize}px`;
		} while (
			currentHeights.element > currentHeights.line &&
			currentFontSize > min
		);
		element.style.removeProperty("font-size");
		setFontSize(currentFontSize);
	}, [ref, step, min, windowSize, setFontSize]);
	return <StyledSpan {...props} ref={ref} css={{ fontSize }} />;
};
