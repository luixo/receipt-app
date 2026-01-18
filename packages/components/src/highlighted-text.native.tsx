import type React from "react";

import { Text } from "~components/text";

import type { Props } from "./highlighted-text";

export const HighlightedText: React.FC<Props> = ({ children }) => (
	<Text className="bg-amber-300">{children}</Text>
);
