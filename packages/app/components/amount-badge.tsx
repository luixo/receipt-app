import { suspendedFallback } from "~app/components/suspense-wrapper";
import { Badge } from "~components/badge";
import type { ViewReactNode } from "~components/view.web";

type Children = ViewReactNode | ((props: { amount: number }) => ViewReactNode);
const renderChildren = (children: Children, amount: number) =>
	typeof children === "function" ? children({ amount }) : children;

export const AmountBadge = suspendedFallback<{
	children: Children;
	useAmount: () => number;
}>(
	({ children, useAmount }) => {
		const amount = useAmount();
		return (
			<Badge content={amount} color="danger" isInvisible={amount === 0}>
				{renderChildren(children, amount)}
			</Badge>
		);
	},
	({ children }) => renderChildren(children, 0),
);
