import React from "react";

import {
	debtAmountSchemaDecimal,
	partSchemaDecimal,
} from "~app/utils/validation";

const getDecimalsPower = (decimalDigits: number) => 10 ** decimalDigits;

export const useDecimals = () => {
	const decimalsPower = getDecimalsPower(debtAmountSchemaDecimal);
	return {
		fromSubunitToUnit: React.useCallback(
			(input: number) => input / decimalsPower,
			[decimalsPower],
		),
		fromUnitToSubunit: React.useCallback(
			(input: number) => Math.round(input * decimalsPower),
			[decimalsPower],
		),
	};
};

const partsDecimalsPower = getDecimalsPower(partSchemaDecimal);
export const useRoundParts = () =>
	React.useCallback(
		(input: number) =>
			Math.round(input * partsDecimalsPower) / partsDecimalsPower,
		[],
	);
