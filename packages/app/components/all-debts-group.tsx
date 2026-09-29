import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "#app/components/app/debts-group.tsx";
import { suspendedFallback } from "#app/components/suspense-wrapper.tsx";
import { useTRPC } from "#app/utils/trpc.ts";

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
