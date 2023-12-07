import React from "react";

import { styled } from "@nextui-org/react";
import { useRouter } from "next/router";

import { Badge } from "app/components/badge";
import { Text } from "app/components/base/text";
import { Link } from "app/components/link";

const Wrapper = styled("div", {
	display: "flex",
	flexDirection: "column",
	padding: "$md",
	maxWidth: 768,
	margin: "0 auto",
});

const MenuWrapper = styled("div", {
	flex: 1,
	display: "flex",
	maxWidth: 640,
	margin: "0 auto",
});

const StickyMenu = styled("div", {
	position: "fixed",
	left: 0,
	bottom: 0,
	width: "100vw",
	background: "$backgroundContrast",
	dropShadow: "$lg",
	shadow: "$xl",
	p: "$4",
	display: "flex",
	zIndex: "$10",
});

// Reserved space after sticky menu - with its approx. height
const StickyMenuPlaceholder = styled("div", {
	height: 82,
});

const MenuItem = styled(Link, {
	flexGrow: 1,
	flexShrink: 1,
	textAlign: "center",
	fontSize: "$xl3",

	display: "flex",
	flexDirection: "column",
	alignItems: "center",

	variants: {
		selected: {
			true: {
				color: "$primary",
			},
		},
	},
});

export type MenuElement = {
	Icon: React.FC<{ size: number }>;
	text: string;
	href: string;
	useBadgeAmount?: () => number;
};

const useZero = () => 0;

const MenuItemComponent: React.FC<MenuElement> = ({
	Icon,
	href,
	text,
	useBadgeAmount = useZero,
}) => {
	const { pathname } = useRouter();
	const amount = useBadgeAmount();
	const selected = pathname === href;
	return (
		<MenuItem key={href} href={href} selected={selected}>
			<Badge amount={amount} css={{ minWidth: 40 }}>
				<Icon size={24} />
			</Badge>
			<Text className={`text-sm leading-8 ${selected ? "text-primary" : ""}`}>
				{text}
			</Text>
		</MenuItem>
	);
};

type Props = {
	children?: React.ReactNode;
	elements: MenuElement[];
};

export const Page: React.FC<Props> = ({ children, elements }) => (
	<Wrapper>
		{children}
		<StickyMenu data-testid="sticky-menu">
			<MenuWrapper>
				{elements.map((props) => (
					<MenuItemComponent key={props.href} {...props} />
				))}
			</MenuWrapper>
		</StickyMenu>
		<StickyMenuPlaceholder />
	</Wrapper>
);
