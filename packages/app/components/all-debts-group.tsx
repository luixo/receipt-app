import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTRPC } from "~app/utils/trpc";

export const AllDebtsGroup = suspendedFallback<
	Omit<React.ComponentProps<typeof DebtsGroup>, "debts">
>(
	(props) => {
		const trpc = useTRPC();
		const { data: debts } = useSuspenseQuery(trpc.debts.getAll.queryOptions());
		return <DebtsGroup debts={debts.items} {...props} />;
	},
	<DebtsGroupSkeleton amount={3} />,
);
