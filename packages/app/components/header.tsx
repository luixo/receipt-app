import React from "react";

import { Spacer, Text, styled } from "@nextui-org/react";

const Wrapper = styled("div", {
	display: "flex",
	justifyContent: "space-between",
});

const Title = styled(Text, {
	display: "flex",
	alignItems: "center",
});

const Icon = styled("span", {
	mr: "$4",
});

const Aside = styled("div", {
	ml: "$4",
	display: "flex",
	alignItems: "center",
	flexShrink: 0,
});

type Props = {
	icon?: React.ReactNode;
	children: React.ReactNode;
	aside?: JSX.Element | JSX.Element[];
} & React.ComponentProps<typeof Text>;

export const Header: React.FC<Props> = ({
	children,
	aside,
	icon,
	...props
}) => {
	const asideElements: JSX.Element[] | undefined =
		aside === undefined ? aside : Array.isArray(aside) ? aside : [aside];
	return (
		<Wrapper>
			<Title h2 {...props}>
				{icon ? <Icon>{icon}</Icon> : null}
				{children}
			</Title>
			{asideElements ? (
				<Aside>
					{asideElements.map((element, index) => (
						<React.Fragment key={element.key}>
							{index === 0 ? null : <Spacer x={0.5} />}
							{element}
						</React.Fragment>
					))}
				</Aside>
			) : null}
		</Wrapper>
	);
};
