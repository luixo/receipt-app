import React from "react";

import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { Trans, useTranslation } from "react-i18next";

type Props = {
	preview: string;
	baseUrl: string;
	children: React.ReactNode;
	footerNote?: React.ReactNode;
};

const main: React.CSSProperties = {
	backgroundColor: "#eaebed",
	fontFamily: "sans-serif",
	fontSize: "14px",
	lineHeight: "1.4",
	margin: 0,
	padding: 0,
};

const container: React.CSSProperties = {
	display: "block",
	margin: "0 auto",
	maxWidth: "580px",
	padding: "10px",
	width: "100%",
};

const heading: React.CSSProperties = {
	color: "#06090f",
	fontSize: "35px",
	fontWeight: 300,
	margin: "20px 0",
	textAlign: "center",
	textTransform: "capitalize",
};

const card: React.CSSProperties = {
	background: "#ffffff",
	borderRadius: "3px",
	boxSizing: "border-box",
	padding: "20px",
};

const footer: React.CSSProperties = {
	color: "#9a9ea6",
	fontSize: "12px",
	marginTop: "10px",
	textAlign: "center",
};

export const subheading: React.CSSProperties = {
	color: "#06090f",
	fontSize: "22px",
	fontWeight: 400,
	marginBottom: "10px",
};

export const button: React.CSSProperties = {
	backgroundColor: "#ec0867",
	border: "solid 1px #ec0867",
	borderRadius: "5px",
	color: "#ffffff",
	display: "inline-block",
	fontSize: "14px",
	fontWeight: "bold",
	margin: "0 0 15px",
	padding: "12px 25px",
	textDecoration: "none",
	textTransform: "capitalize",
};

export const EmailLayout: React.FC<Props> = ({
	preview,
	baseUrl,
	children,
	footerNote,
}) => {
	const { t } = useTranslation("email");
	return (
		<Html lang="en">
			<Head />
			<Preview>{preview}</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading as="h1" style={heading}>
						{t("header")}
					</Heading>
					<Section style={card}>{children}</Section>
					<Section style={footer}>
						{footerNote}
						<Text style={footer}>{t("footer.link")}</Text>
						<Text style={footer}>
							<Trans
								t={t}
								i18nKey="footer.unsubscribe"
								components={{ a: <Link href={`${baseUrl}unsubscribe`} /> }}
							/>
						</Text>
						<Hr />
						<Text style={footer}>
							<Trans
								t={t}
								i18nKey="footer.inspiredBy"
								components={{ a: <Link href="https://postdrop.io" /> }}
							/>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};
