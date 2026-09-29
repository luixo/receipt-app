import type React from "react";

import { useTranslation } from "react-i18next";

import type { Input } from "#components/input.tsx";
import { SkeletonInput } from "#components/skeleton-input.tsx";
import { View } from "#components/view.tsx";

export const SkeletonDateInput: React.FC<
	{ label?: string } & React.ComponentProps<typeof Input>
> = ({ label, ...props }) => {
	const { t } = useTranslation("default");
	return (
		<View>
			<SkeletonInput
				skeletonClassName="w-32"
				label={label || t("components.dateInput.label")}
				{...props}
			/>
		</View>
	);
};
