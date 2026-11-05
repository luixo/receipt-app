import type React from "react";

import { Accordion as AccordionRaw } from "@heroui/react";

export type Props = {
	children?: React.ReactNode;
};

export const Accordion = (props: Props) => <AccordionRaw {...props} />;

export type ItemProps = {
	key: string;
	textValue: string;
	title: React.ReactNode;
	children: React.ReactNode;
};

export const AccordionItem = ({ title, children, textValue }: ItemProps) => (
	<AccordionRaw.Item id={textValue} aria-label={textValue}>
		<AccordionRaw.Heading>
			<AccordionRaw.Trigger className="gap-2">
				{title}
				<AccordionRaw.Indicator />
			</AccordionRaw.Trigger>
		</AccordionRaw.Heading>
		<AccordionRaw.Panel>
			<AccordionRaw.Body>{children}</AccordionRaw.Body>
		</AccordionRaw.Panel>
	</AccordionRaw.Item>
);
