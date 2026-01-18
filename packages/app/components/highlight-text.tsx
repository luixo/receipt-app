import type React from "react";
import { View } from "react-native";

import { HighlightedText } from "~components/highlighted-text";
import { Text } from "~components/text";
import type { Interval } from "~utils/array";

const getInterlacedResult = (intervals: Interval[], input: string) => {
	const interlacedTexts = intervals.reduce<{
		index: number;
		text: string;
		result: string[];
	}>(
		({ text, index, result }, [from, to]) => {
			const regular = text.slice(0, from - index);
			const marked = text.slice(from - index, to - index);
			return {
				index: to,
				text: text.slice(to - index),
				result: [...result, regular, marked],
			};
		},
		{
			index: 0,
			text: input,
			result: [],
		},
	);
	return interlacedTexts.result.length % 2 === 0
		? [...interlacedTexts.result, interlacedTexts.text]
		: [
				...interlacedTexts.result.slice(0, -1),
				`${interlacedTexts.result.at(-1)}${interlacedTexts.text}`,
			];
};

export const HighlightText: React.FC<
	Omit<React.ComponentProps<typeof View>, "children"> & {
		intervals: Interval[];
		children: string;
	}
> = ({ intervals, children, ...props }) => {
	const interlacedResult = getInterlacedResult(intervals, children);
	return (
		<View {...props}>
			{interlacedResult.map((element, index) => {
				/* eslint-disable react/no-array-index-key */
				if (index % 2 === 0) {
					return <Text key={index}>{element}</Text>;
				}
				return <HighlightedText key={index}>{element}</HighlightedText>;
				/* eslint-enable react/no-array-index-key */
			})}
		</View>
	);
};
