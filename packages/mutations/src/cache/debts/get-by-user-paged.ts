import type { TRPCQueryInput } from "~app/trpc";
import type { UsersId } from "~db/models";

import type { ControllerContext, ControllerWith } from "../../types";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getByUserPaged"];
}>;

type Filters = Omit<Partial<TRPCQueryInput<"debts.getByUserPaged">>, "userId">;

const invalidate = (
	{ queryClient, procedure }: Controller,
	userId: UsersId,
	filters?: Filters,
) =>
	queryClient.invalidateQueries(procedure.queryFilter({ userId, ...filters }));

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getByUserPaged };
	return {
		invalidate: (userId: UsersId, filters?: Filters) => {
			void invalidate(controller, userId, filters);
		},
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getByUserPaged };
	return {
		invalidate: (userId: UsersId, filters?: Filters) => {
			void invalidate(controller, userId, filters);
		},
	};
};
