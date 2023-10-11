import { TRPCError } from "@trpc/server";

import type { TRPCQueryOutput } from "app/trpc";

import type { ApiManager } from "./api";

type Account = TRPCQueryOutput<"account.get">;

export const getMockUtils = (api: ApiManager) => {
	const authAnyPage = () => {
		api.mock("receipts.getNonResolvedAmount", () => 0);
		api.mock("debts.getIntentions", () => []);
		api.mock("accountConnectionIntentions.getAll", () => ({
			inbound: [],
			outbound: [],
		}));
	};
	return {
		noAuth: () => {
			api.mock("account.get", () => {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "No token provided - mocked",
				});
			});
		},
		auth: (account: Account | (() => Account)) => {
			api.mock("account.get", account);
			authAnyPage();
		},
		authAnyPage,
		emptyReceipts: () => {
			api.mock("receipts.getPaged", () => ({
				items: [],
				hasMore: false,
				cursor: -1,
				count: 0,
			}));
		},
	};
};

export type MockUtils = ReturnType<typeof getMockUtils>;
