import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "~components/button";
import { RefreshIcon } from "~components/icons";

export const RefreshSettings: React.FC = () => {
	const { t } = useTranslation("settings");
	const queryClient = useQueryClient();
	const refetch = React.useCallback(
		() => queryClient.invalidateQueries({ refetchType: "all" }),
		[queryClient],
	);
	return (
		<Button color="primary" onPress={refetch}>
			<RefreshIcon />
			{t("refresh.header")}
		</Button>
	);
};
