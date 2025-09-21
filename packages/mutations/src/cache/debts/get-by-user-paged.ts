import type { TRPCQueryInput } from "~app/trpc";
import type { UserId } from "~db/ids";

import type { ControllerContext, ControllerWith } from "../../types";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getByUserPaged"];
}>;

type Filters = Omit<Partial<TRPCQueryInput<"debts.getByUserPaged">>, "userId">;

const invalidate = (
	{ queryClient, procedure }: Controller,
	userId: UserId,
	filters?: Filters,
) =>
	queryClient.invalidateQueries(procedure.queryFilter({ userId, ...filters }));

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getByUserPaged };
	return {
		invalidate: (userId: UserId, filters?: Filters) => {
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
		invalidate: (userId: UserId, filters?: Filters) => {
			void invalidate(controller, userId, filters);
		},
	};
};
