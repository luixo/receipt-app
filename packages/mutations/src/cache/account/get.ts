import type { TRPCQueryOutput } from "~app/trpc";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import {
	applyUpdateFnWithRevert,
	applyWithRevert,
	getUpdatedData,
	withRef,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["account"]["get"];
}>;

type Account = TRPCQueryOutput<"account.get">;

const invalidateAccount =
	({ queryClient, procedure }: Controller) =>
	() =>
		queryClient.invalidateQueries(procedure.queryFilter());

const upsert = ({ queryClient, procedure }: Controller, account: Account) =>
	queryClient.setQueryData(procedure.queryKey(), account);

const update =
	({ queryClient, procedure }: Controller) =>
	(updater: UpdateFn<Account>) =>
		withRef<Account | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey(), (account) => {
				ref.current = account;
				return getUpdatedData(account, updater);
			});
		}).current;

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.account.get };
	return {
		update: (updater: UpdateFn<Account>) => update(controller)(updater),
		upsert: (account: Account) => upsert(controller, account),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.account.get };
	return {
		update: (updater: UpdateFn<Account>, revertUpdater: SnapshotFn<Account>) =>
			applyUpdateFnWithRevert(update(controller), updater, revertUpdater),
		upsert: (account: Account) =>
			applyWithRevert(
				() => upsert(controller, account),
				() => invalidateAccount(controller),
			),
	};
};
