import React from "react";

import { fromEntries, keys } from "remeda";

import { CookieContext } from "~app/contexts/cookie-context";
import type { SSRContextData } from "~app/contexts/ssr-context";
import { SSRContext } from "~app/contexts/ssr-context";
import type { CookieStates, CookieValues } from "~app/utils/cookie-data";
import {
	getCookieStatesFromValues,
	getSSRContextCookieData,
	schemas,
} from "~app/utils/cookie-data";
import { updateSetStateAction } from "~utils";

const resolveState = (values: CookieValues) =>
	fromEntries(keys(schemas).map((key) => [key, values[key]])) as CookieValues;

type SetValues = {
	[K in keyof CookieStates]: CookieStates[K][1];
};

type DeleteValues = {
	[K in keyof CookieStates]: CookieStates[K][2];
};

type CookieKey = keyof CookieStates;

type Props = {
	data: SSRContextData;
};

export const SSRDataProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	data: { nowTimestamp, values },
}) => {
	const { setCookie, deleteCookie } = React.useContext(CookieContext);
	const [isMounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);
	const [ssrState, setSsrState] = React.useState<CookieValues | undefined>(
		() => (values ? resolveState(values) : undefined),
	);
	React.useEffect(() => {
		if (!ssrState && values) {
			setSsrState(resolveState(values));
		}
	}, [values, ssrState]);
	const updateValue = React.useCallback(
		<K extends CookieKey>(key: K) =>
			(
				setStateAction: React.SetStateAction<NonNullable<typeof ssrState>[K]>,
			) => {
				setSsrState((prevState) => {
					if (!prevState) {
						return prevState;
					}
					const nextState = updateSetStateAction(
						setStateAction,
						prevState[key],
					);
					// Updating a cookie and updating local state in the same time
					setCookie(key, nextState);
					return { ...prevState, [key]: nextState };
				});
			},
		[setCookie],
	);
	const deleteValue = React.useCallback(
		<K extends CookieKey>(key: K) =>
			() => {
				setSsrState((prevState) => {
					if (!prevState) {
						return prevState;
					}
					// Removing a cookie and updating local state in the same time
					deleteCookie(key);
					return { ...prevState, [key]: schemas[key].parse(undefined) };
				});
			},
		[deleteCookie],
	);
	const ssrSetValues = React.useMemo<SetValues>(
		() =>
			fromEntries(
				keys(schemas).map((key) => [key, updateValue(key)]),
			) as SetValues,
		[updateValue],
	);
	const ssrDeleteValues = React.useMemo<DeleteValues>(
		() =>
			fromEntries(
				keys(schemas).map((key) => [key, deleteValue(key)]),
			) as DeleteValues,
		[deleteValue],
	);
	const ssrStates = React.useMemo(
		() =>
			getCookieStatesFromValues(
				ssrState || getSSRContextCookieData(),
				(key) => ssrSetValues[key],
				(key) => ssrDeleteValues[key],
			),
		[ssrState, ssrSetValues, ssrDeleteValues],
	);
	return (
		<SSRContext.Provider
			value={React.useMemo(
				() => ({ isFirstRender: !isMounted, nowTimestamp, ...ssrStates }),
				[ssrStates, nowTimestamp, isMounted],
			)}
		>
			{children}
		</SSRContext.Provider>
	);
};
