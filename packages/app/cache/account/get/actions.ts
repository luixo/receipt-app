import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { Account } from "./types";

export const set = (trpc: TRPCReactContext, account: Account) =>
	createController(trpc).set(account);

export const update = (
	trpc: TRPCReactContext,
	updater: (account: Account) => Account
) => createController(trpc).update(updater);
