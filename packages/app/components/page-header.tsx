import type React from "react";
import { View } from "react-native";

import Head from "next/head";

import { H1 } from "~components/header";
import { Text } from "~components/text";

// add React.memo when https://github.com/vercel/next.js/issues/59655 is resolved
const PageTitle: React.FC<{ children?: string }> = ({ children }) => (
	<Head>
		<title>{["RA", children].filter(Boolean).join(" - ")}</title>
	</Head>
);

type Props = {
	aside?: React.ReactNode;
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
	title?: string;
} & React.ComponentProps<typeof View>;

export const PageHeader: React.FC<Props> = ({
	aside,
	startContent,
	endContent,
	children,
	title,
	...props
}) => (
	<>
		{/* TODO: convert types to the way so either we have string children or title */}
		<PageTitle>{title || children?.toString()}</PageTitle>
		<View className="flex-row flex-wrap justify-between gap-4">
			<View className="flex-1 flex-row items-center gap-4" {...props}>
				{startContent}
				<Text Component={H1} className="text-4xl font-medium">
					{children}
				</Text>
				{endContent}
			</View>
			<View
				className="ml-auto shrink-0 flex-row gap-2 self-end"
				testID="header-aside"
			>
				{aside}
			</View>
		</View>
	</>
);
