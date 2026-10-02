import { BackLink } from "~components/back-link";
import { ButtonLink, CardLink, Link } from "~components/link";
import { Text } from "~components/text";

import { Group, Section } from "./showcase-section";

const LinkShowcase = () => (
	<Section title="Link">
		<Link to="/login">Login link</Link>
	</Section>
);

const BackLinkShowcase = () => (
	<Section title="BackLink">
		<BackLink to="/login" />
	</Section>
);

const ButtonLinkShowcase = () => (
	<Section title="ButtonLink">
		<ButtonLink to="/register">Register</ButtonLink>
	</Section>
);

const CardLinkShowcase = () => (
	<Section title="CardLink">
		<CardLink to="/login">
			<Text>Login</Text>
		</CardLink>
	</Section>
);

export const LinksShowcase = () => (
	<Group title="Links">
		<LinkShowcase />
		<BackLinkShowcase />
		<ButtonLinkShowcase />
		<CardLinkShowcase />
	</Group>
);
