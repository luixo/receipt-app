import React from "react";

import { Spacer, Text, styled } from "@nextui-org/react";
import { IoMdArrowRoundBack as BackArrow } from "react-icons/io";
import { useRouter } from "solito/router";

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
	lineHeight: 0,
});

const Aside = styled("div", {
	ml: "$4",
	display: "flex",
	alignItems: "center",
	flexShrink: 0,
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
	...props
}) => {
	const asideElements: JSX.Element[] | undefined =
		aside === undefined ? aside : Array.isArray(aside) ? aside : [aside];
	const router = useRouter();
	const back = React.useCallback(() => router.back(), [router]);
	return (
		<Wrapper>
			<Title h2 {...props}>
				<Icon onClick={back}>
					<BackArrow />
				</Icon>
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
