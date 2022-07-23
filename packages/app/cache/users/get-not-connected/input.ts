import zustand from "zustand";

import { UsersGetPagedCursor, UsersGetPagedInput, UsersResult } from "./types";

export const getNextPage = (result: UsersResult): UsersGetPagedCursor =>
	result.hasMore ? result.items[result.items.length - 1]?.name : undefined;

const inputStore = zustand<UsersGetPagedInput>((set) => ({
	limit: 10,
	changeLimit: (nextLimit: UsersGetPagedInput["limit"]) =>
		set(() => ({ limit: nextLimit })),
}));

export const useStore = () =>
	inputStore((state) => ({
		limit: state.limit,
	}));
