import React from "react";

import { fromEntries, keys } from "remeda";

import { StoreContext } from "~app/contexts/store-context";
import { StoreDataContext } from "~app/contexts/store-data-context";
import type { StoreStates, StoreValues } from "~app/utils/store-data";
import { getStoreStatesFromValues, schemas } from "~app/utils/store-data";
import { updateSetStateAction } from "~utils/react";

const resolveState = (values: StoreValues) =>
	fromEntries(keys(schemas).map((key) => [key, values[key]])) as StoreValues;

type SetValues = {
	[K in keyof StoreStates]: StoreStates[K][1];
};

type DeleteValues = {
	[K in keyof StoreStates]: StoreStates[K][2];
};

type StoreKey = keyof StoreStates;

export const StoredDataProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const { setItem, deleteItem, getInitialItems } = React.use(StoreContext);
	const initialItems = getInitialItems();
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);
	const [ssrState, setSsrState] = React.useState<StoreValues>(() =>
		resolveState(initialItems),
	);
	const updateValue = React.useCallback(
		<K extends StoreKey>(key: K) =>
			(setStateAction: React.SetStateAction<(typeof ssrState)[K]>) => {
				setSsrState((prevState) => {
					const nextState = updateSetStateAction(
						setStateAction,
						prevState[key],
					);
					// Updating a store value and updating local state in the same time
					setItem(key, nextState);
					return { ...prevState, [key]: nextState };
				});
			},
		[setItem],
	);
	const deleteValue = React.useCallback(
		<K extends StoreKey>(key: K) =>
			() => {
				setSsrState((prevState) => {
					// Removing a store value and updating local state in the same time
					deleteItem(key);
					return { ...prevState, [key]: schemas[key].parse(undefined) };
				});
			},
		[deleteItem],
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
			getStoreStatesFromValues(
				ssrState,
				(key) => ssrSetValues[key],
				(key) => ssrDeleteValues[key],
			),
		[ssrState, ssrSetValues, ssrDeleteValues],
	);
	return (
		<StoreDataContext
			value={React.useMemo(
				() => ({
					isFirstRender: !mounted,
					nowTimestamp: initialItems.nowTimestamp,
					...ssrStates,
				}),
				[ssrStates, initialItems.nowTimestamp, mounted],
			)}
		>
			{children}
		</StoreDataContext>
	);
};
