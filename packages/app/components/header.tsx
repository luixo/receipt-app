import React from "react";
import { View } from "react-native";

import { Spacer } from "@nextui-org/react-tailwind";
import Head from "next/head";
import { IoMdArrowRoundBack as BackArrow } from "react-icons/io";

import { Text } from "app/components/base/text";
import { useRouter } from "app/hooks/use-router";

type Props = {
	backHref?: string;
	aside?: JSX.Element | JSX.Element[];
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
	title?: string;
	children?: string;
} & Omit<React.ComponentProps<typeof View>, "children">;

export const Header: React.FC<Props> = ({
	aside,
	backHref,
	startContent,
	endContent,
	children,
	title,
	...props
}) => {
	const asideElements: JSX.Element[] | undefined =
		aside === undefined ? aside : Array.isArray(aside) ? aside : [aside];
	const router = useRouter();
	const back = React.useCallback(
		() => router.push(backHref!),
		[router, backHref],
	);
	return (
		<View className="flex-row justify-between max-sm:flex-col">
			<Head>
				<title>{`RA - ${title || children}`}</title>
			</Head>
			<View className="flex-row items-center" {...props}>
				{backHref ? (
					<BackArrow className="mr-4" size={36} onClick={back} />
				) : null}
				<View className="flex-row">
					{startContent ? (
						<View className="mr-4 flex-row items-center gap-4">
							{startContent}
						</View>
					) : null}
					<Text className="text-4xl font-medium">{children}</Text>
					{endContent ? (
						<View
							className={`${
								children ? "ml-4" : ""
							} flex-row items-center gap-4`}
						>
							{endContent}
						</View>
					) : null}
				</View>
			</View>
			{asideElements ? (
				<>
					<Spacer className="sm:hidden" y={4} />
					<View className="shrink-0 flex-row max-sm:self-end">
						{asideElements.map((element, index) => (
							<React.Fragment key={element.key}>
								{index === 0 ? null : <Spacer x={2} />}
								{element}
							</React.Fragment>
						))}
					</View>
				</>
			) : null}
		</View>
	);
};
