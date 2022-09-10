import zustand, {
	State,
	StateCreator,
	StoreApi,
	StoreMutatorIdentifier,
} from "zustand";
import createContext from "zustand/context";

export type ParsedQuery = Partial<Record<string, string>>;

export const createStore = <
	T extends State,
	S extends StoreApi<State> & StoreApi<T> = StoreApi<State> & StoreApi<T>,
	Mos extends [StoreMutatorIdentifier, unknown][] = []
>(
	initializer: StateCreator<T, [], Mos>,
	getDataByQuery?: (query: ParsedQuery) => Partial<T>
) => {
	const zustandContext = createContext<S>();

	const { Provider, useStore } = zustandContext;

	const initializeStore = (query: ParsedQuery) => {
		const boundStore = zustand(initializer);
		if (getDataByQuery) {
			boundStore.setState(getDataByQuery(query));
		}
		return boundStore;
	};

	let store: ReturnType<typeof initializeStore>;
	const useCreateStore = (query: ParsedQuery) => {
		if (typeof window === "undefined") {
			return () => initializeStore(query);
		}
		store = store ?? initializeStore(query);
		return () => store;
	};
	return { Provider, useStore, useCreateStore };
};
