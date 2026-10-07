import { Avatar, AvatarGroup } from "~components/avatar";
import { Text } from "~components/text";
import { User } from "~components/user";
import { View } from "~components/view";

import { Group, Section } from "./showcase-section";

const AvatarShowcase = () => (
	<Section title="Avatar">
		<View className="flex flex-row flex-wrap items-center gap-3">
			{(["sm", "md", "lg"] as const).map((size) => (
				<Avatar key={size} hashId={size} size={size} />
			))}
			<Avatar hashId="dimmed" dimmed />
		</View>
	</Section>
);

const AvatarGroupShowcase = () => (
	<Section title="AvatarGroup">
		<AvatarGroup size="sm">
			{["Ada", "Lin", "Sam"].map((name) => (
				<Avatar key={name} hashId={name} />
			))}
		</AvatarGroup>
	</Section>
);

const BeamAvatarShowcase = () => (
	<Section title="BeamAvatar">
		<Avatar hashId="generated-beam" />
		<Text>Generated fallback avatar</Text>
	</Section>
);

const UserExample = () => (
	<Section title="User">
		<User
			name="Ada"
			description="With generated avatar"
			avatarProps={{ hashId: "Ada" }}
		/>
		<User name="Lin" description="Without avatar" />
	</Section>
);

export const UserShowcase = () => (
	<Group title="User">
		<AvatarShowcase />
		<AvatarGroupShowcase />
		<BeamAvatarShowcase />
		<UserExample />
	</Group>
);
