import type React from "react";

import { Switch } from "~components/switch";

export const SkeletonSwitch: React.FC<React.ComponentProps<typeof Switch>> = (
	props,
) => <Switch {...props} isDisabled isReadOnly />;
