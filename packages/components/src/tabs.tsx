import type React from "react";

import { Tab, Tabs } from "@heroui/tabs";

import { Skeleton } from "~components/skeleton";

type Props = {
	tabsAmount: number;
	content: React.ReactNode;
};

export const TabsSkeleton: React.FC<
	Omit<React.ComponentProps<typeof Tabs>, keyof Props> & Props
> = ({ tabsAmount, content, ...props }) => (
	<>
		<Tabs {...props}>
			{Array.from({ length: tabsAmount }).map((_, index) => (
				// eslint-disable-next-line react/no-array-index-key
				<Tab key={index} title={<Skeleton className="h-5 w-20" />} />
			))}
		</Tabs>
		{content}
	</>
);
export { Tabs, Tab };
