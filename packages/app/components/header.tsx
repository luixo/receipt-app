import React from "react";

import { Spacer, Text, styled } from "@nextui-org/react";
import { IoMdArrowRoundBack as BackArrow } from "react-icons/io";

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

const Title = styled(Text, {
	display: "flex",
	alignItems: "center",
});

const Icon = styled("div", {
	mr: "$4",
	lineHeight: 0,
	whiteSpace: "pre",
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
	children: React.ReactNode;
	aside?: JSX.Element | JSX.Element[];
} & React.ComponentProps<typeof Text>;

export const Header: React.FC<Props> = ({
	children,
	aside,
	icon,
	backHref,
	...props
}) => {
	const asideElements: JSX.Element[] | undefined =
		aside === undefined ? aside : Array.isArray(aside) ? aside : [aside];
	const router = useRouter();
	const back = React.useCallback(
		() => router.push(backHref!),
		[router, backHref]
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
			<Title h2 {...props}>
				{backHref ? (
					<Icon onClick={back}>
						<BackArrow />
					</Icon>
				) : null}
				{icon ? <Icon>{icon}</Icon> : null}
				{children}
			</Title>
			{asideElements ? (
				<>
					{verticalLayout ? <Spacer y={1} /> : null}
					<Aside flexEnd={verticalLayout} ref={asideRef}>
						{asideElements.map((element, index) => (
							<React.Fragment key={element.key}>
								{index === 0 ? null : <Spacer x={0.5} />}
								{element}
							</React.Fragment>
						))}
					</Aside>
				</>
			) : null}
		</Wrapper>
	);
};
