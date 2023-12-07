import React from "react";
import { View } from "react-native";

import { styled } from "@nextui-org/react";
import { Spacer } from "@nextui-org/react-tailwind";
import Head from "next/head";
import { IoMdArrowRoundBack as BackArrow } from "react-icons/io";

import { Text } from "app/components/base/text";
import { useRouter } from "app/hooks/use-router";
import { useWindowSizeChange } from "app/hooks/use-window-size-change";

const Wrapper = styled("div", {
	display: "flex",
	justifyContent: "space-between",

	variants: {
		column: {
			true: {
				flexDirection: "column",
			},
		},
	},
});

const Aside = styled("div", {
	ml: "$4",
	display: "flex",
	alignItems: "center",
	flexShrink: 0,

	variants: {
		flexEnd: {
			true: {
				justifyContent: "flex-end",
			},
		},
	},
});

type Props = {
	backHref?: string;
	icon?: React.ReactNode;
	aside?: JSX.Element | JSX.Element[];
} & React.ComponentProps<typeof View> &
	(
		| {
				children: Exclude<React.ReactNode, string>;
				textChildren: string;
		  }
		| {
				children: string;
				textChildren?: string;
		  }
	);

export const Header: React.FC<Props> = ({
	children,
	aside,
	icon,
	backHref,
	textChildren,
	...props
}) => {
	const asideElements: JSX.Element[] | undefined =
		aside === undefined ? aside : Array.isArray(aside) ? aside : [aside];
	const router = useRouter();
	const back = React.useCallback(
		() => router.push(backHref!),
		[router, backHref],
	);
	const [verticalLayout, setVerticalLayout] = React.useState(false);
	const wrapperRef = React.useRef<HTMLDivElement>(null);
	const asideRef = React.useRef<HTMLDivElement>(null);
	useWindowSizeChange(() => {
		const container = wrapperRef.current;
		const asideContainer = asideRef.current;
		if (!container || !asideContainer) {
			return;
		}
		container.style.flexDirection = "row";
		const asideOverflow =
			asideContainer.scrollWidth - asideContainer.offsetWidth;
		const containerOverflow = container.scrollWidth - container.offsetWidth;
		setVerticalLayout(containerOverflow - asideOverflow > 1);
		container.style.flexDirection = "";
	}, [setVerticalLayout, wrapperRef]);
	return (
		<Wrapper column={verticalLayout} ref={wrapperRef}>
			<Head>
				<title>{`RA - ${textChildren || (children as string)}`}</title>
			</Head>
			<View className="flex-row items-center" {...props}>
				{backHref ? (
					<BackArrow className="mr-4" size={36} onClick={back} />
				) : null}
				{icon ? <View className="mr-2">{icon}</View> : null}
				<Text className="text-4xl font-medium">{children}</Text>
			</View>
			{asideElements ? (
				<>
					{verticalLayout ? <Spacer y={4} /> : null}
					<Aside flexEnd={verticalLayout} ref={asideRef}>
						{asideElements.map((element, index) => (
							<React.Fragment key={element.key}>
								{index === 0 ? null : <Spacer x={2} />}
								{element}
							</React.Fragment>
						))}
					</Aside>
				</>
			) : null}
		</Wrapper>
	);
};
