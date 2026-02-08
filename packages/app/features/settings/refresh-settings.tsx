import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { Text } from "~components/text";

export const RefreshSettings: React.FC = () => {
	const { t } = useTranslation("settings");
	const queryClient = useQueryClient();
	const refetch = React.useCallback(
		() => queryClient.invalidateQueries({ refetchType: "all" }),
		[queryClient],
	);
	return (
		<Button color="primary" onPress={refetch}>
			<Icon name="refresh" />
			<Text>{t("refresh.header")}</Text>
		</Button>
	);
};
