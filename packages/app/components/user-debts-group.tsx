import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTRPC } from "~app/utils/trpc";
import type { UserId } from "~db/ids";

export const UserDebtsGroup = suspendedFallback<
	Omit<React.ComponentProps<typeof DebtsGroup>, "debts"> & { userId: UserId }
>(
	({ userId, ...props }) => {
		const trpc = useTRPC();
		const { data: debts } = useSuspenseQuery(
			trpc.debts.getAllUser.queryOptions({ userId }),
		);
		return <DebtsGroup debts={debts.items} {...props} />;
	},
	<DebtsGroupSkeleton amount={3} />,
);
