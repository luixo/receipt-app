import React from "react";

import { Button, CSS, Loading } from "@nextui-org/react";

type PaginationButton = {
	loading: boolean;
	disabled: boolean;
	onClick: () => void;
};

export type Props = {
	prevAll?: PaginationButton;
	prev: PaginationButton;
	nextAll?: PaginationButton;
	next: PaginationButton;
	selectedPage: number;
	totalPages?: number;
};

type ButtonProps = PaginationButton & {
	children: React.ReactNode;
	css?: CSS;
};

const PaginationButtonElement: React.FC<ButtonProps> = ({
	loading,
	disabled,
	onClick,
	children,
	css,
}) => (
	<Button
		onClick={loading || disabled ? undefined : onClick}
		disabled={disabled}
		css={css}
	>
		{loading ? <Loading color="currentColor" size="xs" /> : children}
	</Button>
);

export const Pagination: React.FC<Props> = ({
	selectedPage,
	totalPages,
	prev,
	prevAll,
	next,
	nextAll,
}) => (
	<Button.Group size="sm" bordered>
		{prevAll ? (
			<PaginationButtonElement {...prevAll} css={{ borderRight: "none" }}>
				{"<<"}
			</PaginationButtonElement>
		) : null}
		<PaginationButtonElement {...prev} css={{ borderRight: "none" }}>
			{"<"}
		</PaginationButtonElement>
		<Button animated={false} css={{ borderRight: "none" }}>
			{selectedPage} of {totalPages === undefined ? "?" : totalPages}
		</Button>
		<PaginationButtonElement
			{...next}
			css={nextAll ? { borderRight: "none" } : undefined}
		>
			{">"}
		</PaginationButtonElement>
		{nextAll ? (
			<PaginationButtonElement {...nextAll}>{">>"}</PaginationButtonElement>
		) : null}
	</Button.Group>
);
