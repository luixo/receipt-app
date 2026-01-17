import type React from "react";

export type Props = React.ComponentProps<"mark">;

export const HighlightedText: React.FC<Props> = (props) => <mark {...props} />;
