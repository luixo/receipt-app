import type React from "react";

export type Props = {
	children: string;
};

export const HighlightedText: React.FC<Props> = (props) => <mark {...props} />;
