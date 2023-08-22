import React from "react";

import type { CSS } from "@nextui-org/react";
import { Grid as OriginalGrid } from "@nextui-org/react";

import type { BreakpointValues } from "app/hooks/use-match-media-value";
import {
	breakpointKeys,
	useMatchMediaValue,
} from "app/hooks/use-match-media-value";
import { capitalize } from "app/utils/utils";

type ColumnAmount = number;
type ColumnAmountOrAuto = ColumnAmount | boolean;

// Right from @nextui-org/react
const getItemLayout = (column?: ColumnAmountOrAuto): CSS => {
	const display = column === 0 ? "none" : "inherit";
	if (typeof column === "number") {
		const width = (100 / 12) * column;
		const ratio = width > 100 ? "100%" : width < 0 ? "0" : `${width}%`;
		return {
			flexGrow: 0,
			display,
			maxWidth: ratio,
			flexBasis: ratio,
		};
	}
	return {
		flexGrow: 1,
		display,
		maxWidth: "100%",
		flexBasis: "0",
	};
};

type BreakpointValuesWithPostfix<P extends string, T> = Partial<{
	[K in keyof BreakpointValues<unknown> as `${K}${Capitalize<P>}`]: T;
}>;

type Props = React.ComponentProps<typeof OriginalGrid> & {
	defaultCol?: ColumnAmountOrAuto;
} & BreakpointValuesWithPostfix<"col", ColumnAmountOrAuto> &
	BreakpointValuesWithPostfix<"css", CSS>;

const unwrapProps = <
	Value,
	Postfix extends string = string,
	ExtraValues extends BreakpointValuesWithPostfix<
		Postfix,
		Value
	> = BreakpointValuesWithPostfix<Postfix, Value>,
	Values extends ExtraValues = ExtraValues,
>(
	values: Values,
	postfix: Postfix,
): [Omit<Values, keyof ExtraValues>, Partial<BreakpointValues<Value>>] => {
	const valuesClone = { ...values };
	const extraValues: Partial<BreakpointValues<Value>> = {};
	breakpointKeys.forEach((key) => {
		const lessKey = `less${capitalize(key)}` as keyof BreakpointValues<unknown>;
		const postfixLessKey = `${lessKey}${capitalize(
			postfix,
		)}` as keyof ExtraValues;
		if (valuesClone[postfixLessKey] !== undefined) {
			extraValues[lessKey] = valuesClone[postfixLessKey] as Value;
			delete valuesClone[postfixLessKey];
		}
	});
	return [valuesClone, extraValues];
};

export const Grid: React.FC<Props> & {
	Container: (typeof OriginalGrid)["Container"];
} = ({ defaultCol, ...props }) => {
	const [propsWithoutCols, cols] = unwrapProps<ColumnAmountOrAuto, "col">(
		props,
		"col",
	);
	const columnValue = useMatchMediaValue(defaultCol, cols);
	const [plainProps, csss] = unwrapProps<CSS>(propsWithoutCols, "css");
	const additionalCss = useMatchMediaValue({}, csss);

	return (
		<OriginalGrid
			{...plainProps}
			css={{
				...getItemLayout(columnValue),
				...props.css,
				...additionalCss,
			}}
		/>
	);
};

Grid.Container = OriginalGrid.Container;
