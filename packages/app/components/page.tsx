import React from "react";

import { styled, Text } from "@nextui-org/react";
import { useRouter } from "next/router";
import {
	BsPersonPlusFill as RegisterIcon,
	BsPersonCheck as LoginIcon,
} from "react-icons/bs";

import { Badge } from "app/components/badge";
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
	zIndex: "$2",
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

const UNPROTECTED_ELEMENTS: MenuElement[] = [
	{
		href: "/login",
		Icon: LoginIcon,
		text: "Login",
	},
	{
		href: "/register",
		Icon: RegisterIcon,
		text: "Register",
	},
];

const useZero = () => 0;

const MenuItemComponent: React.FC<MenuElement> = ({
	Icon,
	href,
	text,
	useBadgeAmount = useZero,
}) => {
	const router = useRouter();
	const amount = useBadgeAmount();
	return (
		<MenuItem key={href} href={href} selected={router.pathname === href}>
			<Badge amount={amount} css={{ minWidth: 40 }}>
				<Icon size={24} />
			</Badge>
			<Text size="$sm" css={{ lineHeight: "$md" }} color="inherit">
				{text}
			</Text>
		</MenuItem>
	);
};

type Props = {
	children?: React.ReactNode;
	elements?: MenuElement[];
};

export const Page: React.FC<Props> = ({
	children,
	elements = UNPROTECTED_ELEMENTS,
}) => (
	<Wrapper>
		{children}
		<StickyMenu>
			<MenuWrapper>
				{elements.map((props) => (
					<MenuItemComponent key={props.href} {...props} />
				))}
			</MenuWrapper>
		</StickyMenu>
		<StickyMenuPlaceholder />
	</Wrapper>
);
