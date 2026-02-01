import type React from "react";

import {
	AccordionItem as AccordionItemRaw,
	Accordion as AccordionRaw,
} from "@heroui/accordion";

export type Props = {
	children: React.ComponentProps<typeof AccordionRaw>["children"];
};

export const Accordion = (props: Props) => <AccordionRaw {...props} />;

export type ItemProps = {
	key: string;
	textValue: string;
	title: React.ReactNode;
	children: React.ReactNode;
};

export const AccordionItem = (props: ItemProps) => (
	<AccordionItemRaw {...props} />
);

// @ts-expect-error see https://github.com/heroui-inc/heroui/issues/729
AccordionItem.getCollectionNode = AccordionItemRaw.getCollectionNode;
