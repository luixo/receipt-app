import { Skeleton } from "~components/skeleton";
import { SkeletonAvatar } from "~components/skeleton-avatar";
import { SkeletonDateInput } from "~components/skeleton-date-input";
import { SkeletonInput } from "~components/skeleton-input";
import { SkeletonNumberInput } from "~components/skeleton-number-input";
import { SkeletonSwitch } from "~components/skeleton-switch";

import { Group, Section } from "./showcase-section";

const SkeletonExample = () => (
	<Section title="Skeleton">
		<Skeleton className="h-6 w-24 rounded-md" />
	</Section>
);

const SkeletonAvatarShowcase = () => (
	<Section title="SkeletonAvatar">
		<SkeletonAvatar />
	</Section>
);

const SkeletonDateInputShowcase = () => (
	<Section title="SkeletonDateInput">
		<SkeletonDateInput label="Loading date" />
	</Section>
);

const SkeletonInputShowcase = () => (
	<Section title="SkeletonInput">
		<SkeletonInput label="Loading input" />
	</Section>
);

const SkeletonNumberInputShowcase = () => (
	<Section title="SkeletonNumberInput">
		<SkeletonNumberInput label="Loading number" />
	</Section>
);

const SkeletonSwitchShowcase = () => (
	<Section title="SkeletonSwitch">
		<SkeletonSwitch />
	</Section>
);

export const SkeletonShowcase = () => (
	<Group title="Skeleton">
		<SkeletonExample />
		<SkeletonAvatarShowcase />
		<SkeletonDateInputShowcase />
		<SkeletonInputShowcase />
		<SkeletonNumberInputShowcase />
		<SkeletonSwitchShowcase />
	</Group>
);
