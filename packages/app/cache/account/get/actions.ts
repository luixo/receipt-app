import { TRPCReactContext, InvalidateArgs } from "app/trpc";

import { createController } from "./controller";
import { Account } from "./types";

export const set = (trpc: TRPCReactContext, account: Account) =>
	createController(trpc).set(account);

export const invalidate = (trpc: TRPCReactContext, ...args: InvalidateArgs) =>
	createController(trpc).invalidate(...args);

export const update = (
	trpc: TRPCReactContext,
	updater: (account: Account) => Account
) => createController(trpc).update(updater);
