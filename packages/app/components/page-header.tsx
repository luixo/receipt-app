import React from "react";
import { View } from "react-native";

import { H1 } from "@expo/html-elements";
import { IoMdArrowRoundBack as BackArrow } from "react-icons/io";

import { PageTitle } from "app/components/base/page-title";
import { Text } from "app/components/base/text";
import { useRouter } from "app/hooks/use-router";

type Props = {
	backHref?: string;
	aside?: React.ReactNode;
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
	title?: string;
} & React.ComponentProps<typeof View>;

export const PageHeader: React.FC<Props> = ({
	aside,
	backHref,
	startContent,
	endContent,
	children,
	title,
	...props
}) => {
	const router = useRouter();
	const back = React.useCallback(
		() => router.push(backHref!),
		[router, backHref],
	);
	return (
		<>
			<PageTitle>{title || children?.toString()}</PageTitle>
			<View className="flex-row flex-wrap justify-between gap-4">
				<View className="flex-row items-center gap-4" {...props}>
					{backHref ? <BackArrow size={36} onClick={back} /> : null}
					{startContent}
					<Text Component={H1} className="text-4xl font-medium">
						{children}
					</Text>
					{endContent}
				</View>
				<View className="ml-auto shrink-0 flex-row gap-2 self-end">
					{aside}
				</View>
			</View>
		</>
	);
};
