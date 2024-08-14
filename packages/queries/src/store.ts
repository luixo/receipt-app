import React from "react";

import type {
	ExtractState,
	StateCreator,
	StoreApi,
	StoreMutatorIdentifier,
	WithReact,
} from "zustand";
import { createStore as createZustandStore, useStore } from "zustand";

import type { ParametersExceptFirst } from "~utils/types";

import type { ParsedQuery } from "./types";

// curried useStore hook type recreation
type UseStoreCurried<T> = {
	<S extends WithReact<StoreApi<T>>>(): ExtractState<S>;
	<S extends WithReact<StoreApi<T>>, U>(
		selector: (state: ExtractState<S>) => U,
		equalityFn?: (a: U, b: U) => boolean,
	): U;
	<TState, StateSlice>(
		selector: (state: TState) => StateSlice,
		equalityFn?: (a: StateSlice, b: StateSlice) => boolean,
	): StateSlice;
};

export const createStore = <
	T,
	Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
	initializer: StateCreator<T, [], Mos>,
	getDataByQuery?: (query: ParsedQuery) => Partial<T>,
) => {
	const StoreContext = React.createContext<StoreApi<T> | undefined>(undefined);
	const useStoreCurried: UseStoreCurried<T> = (...args: unknown[]) => {
		const store = React.useContext(StoreContext);
		if (!store) {
			throw new Error("Expected to have store context");
		}
		return useStore(store, ...(args as ParametersExceptFirst<typeof useStore>));
	};

	const Provider = React.memo<
		React.PropsWithChildren<{ parsedQuery: ParsedQuery }>
	>(({ children, parsedQuery }) => {
		const [store] = React.useState(() => {
			const boundStore = createZustandStore<T, Mos>(initializer);
			if (getDataByQuery) {
				boundStore.setState(getDataByQuery(parsedQuery));
			}
			return boundStore;
		});
		return React.createElement(
			StoreContext.Provider,
			{ value: store },
			children,
		);
	});

	return { Provider, useStore: useStoreCurried };
};
