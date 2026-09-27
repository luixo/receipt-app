import { Accordion as AccordionRaw } from "heroui-native/accordion";
import { PressableFeedback } from "heroui-native/pressable-feedback";

import type { ItemProps, Props } from "~components/accordion";

export const Accordion = ({ children }: Props) => (
	<AccordionRaw>{children}</AccordionRaw>
);

export const AccordionItem = ({ textValue, title, children }: ItemProps) => (
	<AccordionRaw.Item value={textValue}>
		<AccordionRaw.Trigger asChild>
			<PressableFeedback>
				{title}
				<AccordionRaw.Indicator />
			</PressableFeedback>
		</AccordionRaw.Trigger>
		<AccordionRaw.Content>{children}</AccordionRaw.Content>
	</AccordionRaw.Item>
);
