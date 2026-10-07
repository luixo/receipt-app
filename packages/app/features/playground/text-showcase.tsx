import { HighlightedText } from "~components/highlighted-text";
import { Text } from "~components/text";

import { Group, Section } from "./showcase-section";

const TextExample = () => (
	<Section title="Text">
		{(["span", "h1", "h2", "h3", "h4", "p", "blockquote", "code"] as const).map(
			(variant) => (
				<Text key={variant} variant={variant}>
					Variant {variant}
				</Text>
			),
		)}
	</Section>
);

const HighlightedTextShowcase = () => (
	<Section title="HighlightedText">
		<HighlightedText>Highlighted example</HighlightedText>
	</Section>
);

export const TextShowcase = () => (
	<Group title="Text">
		<TextExample />
		<HighlightedTextShowcase />
	</Group>
);
