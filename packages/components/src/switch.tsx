import type React from "react";

import { Switch } from "@heroui/switch";

export const SkeletonSwitch: React.FC<React.ComponentProps<typeof Switch>> = (
	props,
) => <Switch {...props} isDisabled isReadOnly />;

export { Switch } from "@heroui/switch";
