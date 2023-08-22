import React from "react";

import type { SwitchEvent } from "@nextui-org/react";
import { Loading, Switch } from "@nextui-org/react";

import { ErrorMessage, QueryErrorMessage } from "app/components/error-message";
import { trpc } from "app/trpc";

export const AutoAcceptDebtsOption: React.FC = () => {
	const settingsQuery = trpc.accountSettings.get.useQuery();
	const updateSettingsMutation = trpc.accountSettings.update.useMutation();
	const onChange = React.useCallback(
		(e: SwitchEvent) =>
			updateSettingsMutation.mutate({
				type: "autoAcceptDebts",
				value: e.target.checked,
			}),
		[updateSettingsMutation],
	);
	const errorButton = React.useMemo(
		() => ({ text: "Reset", onClick: updateSettingsMutation.reset }),
		[updateSettingsMutation],
	);
	if (settingsQuery.status === "loading") {
		return <Loading />;
	}
	if (settingsQuery.status === "error") {
		return <QueryErrorMessage query={settingsQuery} />;
	}
	return (
		<>
			<Switch
				checked={settingsQuery.data.autoAcceptDebts}
				onChange={onChange}
				icon={
					updateSettingsMutation.isLoading ? <Loading size="xs" /> : undefined
				}
				bordered
				disabled={updateSettingsMutation.isLoading}
			/>
			{updateSettingsMutation.status === "error" ? (
				<ErrorMessage
					message={updateSettingsMutation.error.message}
					button={errorButton}
				/>
			) : null}
		</>
	);
};
