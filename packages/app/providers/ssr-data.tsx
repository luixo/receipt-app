import React from "react";

import { CookieContext } from "app/contexts/cookie-context";
import type { SSRContextData } from "app/contexts/ssr-context";
import { SSRContext } from "app/contexts/ssr-context";
import type { CookieStates } from "app/utils/cookie-data";
import { getCookieStatesFromValues, schemas } from "app/utils/cookie-data";
import { updateSetStateAction } from "app/utils/utils";

type SetValues = {
	[K in keyof CookieStates]: CookieStates[K][1];
};

type DeleteValues = {
	[K in keyof CookieStates]: CookieStates[K][2];
};

type CookieKey = keyof CookieStates;

export type Props = {
	data: SSRContextData;
};

export const SSRDataProvider: React.FC<React.PropsWithChildren<Props>> = ({
	children,
	data: { nowTimestamp, ...data },
}) => {
	const { setCookie, deleteCookie } = React.useContext(CookieContext);
	const [isMounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);
	const [ssrState, setSsrState] = React.useState(
		() =>
			Object.fromEntries(
				Object.keys(schemas).map((key) => [
					key,
					data[key as keyof typeof schemas],
				]),
			) as typeof data,
	);
	const updateValue = React.useCallback(
		<K extends CookieKey>(key: K) =>
			(setStateAction: React.SetStateAction<(typeof ssrState)[K]>) => {
				setSsrState((prevState) => {
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
					// Removing a cookie and updating local state in the same time
					deleteCookie(key);
					return { ...prevState, [key]: schemas[key].parse(undefined) };
				});
			},
		[deleteCookie],
	);
	const ssrSetValues = React.useMemo(
		() =>
			Object.fromEntries(
				Object.keys(schemas).map((key) => [
					key as CookieKey,
					updateValue(key as CookieKey),
				]),
			) as SetValues,
		[updateValue],
	);
	const ssrDeleteValues = React.useMemo<DeleteValues>(
		() =>
			Object.fromEntries(
				Object.keys(schemas).map((key) => [
					key as CookieKey,
					deleteValue(key as CookieKey),
				]),
			) as DeleteValues,
		[deleteValue],
	);
	const ssrStates = React.useMemo(
		() =>
			getCookieStatesFromValues(
				ssrState,
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
