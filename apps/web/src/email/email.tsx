import React from "react";

import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
	pixelBasedPreset,
} from "@react-email/components";
import { Trans, useTranslation } from "react-i18next";

import { Link } from "./components";

type Props = {
	title: string;
	subtitle: string;
	children: React.ReactNode;
	footerNote?: React.ReactNode;
};

const tailwindConfig = {
	presets: [pixelBasedPreset],
	theme: {
		extend: {
			colors: {
				brand: "#ec0867",
				canvas: "#eaebed",
				ink: "#06090f",
				muted: "#9a9ea6",
			},
		},
	},
};

export const EmailLayout: React.FC<Props> = ({
	title,
	subtitle,
	children,
	footerNote,
}) => {
	const { t } = useTranslation("email");
	return (
		<Tailwind config={tailwindConfig}>
			<Html lang="en">
				<Head />
				<Preview>{title}</Preview>
				<Body className="bg-canvas m-0 font-sans text-sm leading-[1.4]">
					<Container className="mx-auto block w-full max-w-145 p-2.5">
						<Heading className="text-ink m-[20px_0] text-center text-[35px] font-light capitalize">
							{t("header")}
						</Heading>
						<Section className="box-border rounded-[3px] bg-white p-5">
							<Heading
								as="h3"
								className="text-ink mb-2.5 text-[22px] font-normal"
							>
								{subtitle}
							</Heading>
							{children}
						</Section>
						<Section className="text-muted mt-2 text-center text-xs">
							{footerNote}
							<Text className="text-muted m-0 mb-4 text-xs">
								{t("footer.link")}
							</Text>
							<Text className="text-muted m-0 mb-4 text-xs">
								<Trans
									t={t}
									i18nKey="footer.unsubscribe"
									components={{
										a: (
											<Link
												className="text-muted underline"
												navigate={{ to: "/" }}
											/>
										),
									}}
								/>
							</Text>
							<Hr className="border-0" />
							<Text className="text-muted m-0 mb-4 text-xs">
								<Trans
									t={t}
									i18nKey="footer.inspiredBy"
									components={{
										a: (
											<Link
												className="text-muted underline"
												href="https://postdrop.io"
											/>
										),
									}}
								/>
							</Text>
						</Section>
					</Container>
				</Body>
			</Html>
		</Tailwind>
	);
};
