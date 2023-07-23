import React from "react";

import { styled } from "@nextui-org/react";

import { useIsomorphicLayoutEffect } from "app/hooks/use-isomorphic-layout-effect";
import { useWindowSize } from "app/hooks/use-window-size";

const StyledSpan = styled("span");

type Props = {
	fontSizeMin: number;
	fontSizeStep?: number;
};

export const ShrinkText: React.FC<
	React.ComponentProps<typeof StyledSpan> & Props
> = ({ fontSizeMin, fontSizeStep = 2, ...props }) => {
	const ref = React.useRef<HTMLSpanElement>(null);
	const [fontSize, setFontSize] = React.useState<number | undefined>();
	const windowSize = useWindowSize();
	useIsomorphicLayoutEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}
		const computedStyle = window.getComputedStyle(element);
		element.style.fontSize = "inherit";
		let currentFontSize =
			parseInt(computedStyle.getPropertyValue("font-size"), 10) + fontSizeStep;
		const currentHeights = { element: 0, line: 0 };
		do {
			currentHeights.element = parseInt(
				computedStyle.getPropertyValue("height"),
				10,
			);
			currentHeights.line = parseInt(
				computedStyle.getPropertyValue("line-height"),
				10,
			);
			currentFontSize -= fontSizeStep;
			element.style.fontSize = `${currentFontSize}px`;
		} while (
			currentHeights.element > currentHeights.line &&
			currentFontSize > fontSizeMin
		);
		element.style.removeProperty("font-size");
		setFontSize(currentFontSize);
	}, [ref, fontSizeStep, fontSizeMin, windowSize, setFontSize]);
	return <StyledSpan {...props} ref={ref} css={{ fontSize }} />;
};
