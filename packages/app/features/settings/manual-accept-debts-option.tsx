import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { ErrorMessage } from "#app/components/error-message.tsx";
import { suspendedFallback } from "#app/components/suspense-wrapper.tsx";
import { useTrpcMutationOptions } from "#app/hooks/use-trpc-mutation-options.ts";
import { useTRPC } from "#app/utils/trpc.ts";
import { SkeletonSwitch } from "#components/skeleton-switch.tsx";
import { Spinner } from "#components/spinner.tsx";
import { Switch } from "#components/switch.tsx";
import { options as userSettingsUpdateOptions } from "#mutations/user-settings/update.ts";

export const ManualAcceptDebtsOption = suspendedFallback(
	() => {
		const trpc = useTRPC();
		const { data: settings } = useSuspenseQuery(
			trpc.userSettings.get.queryOptions(),
		);
		const updateSettingsMutation = useMutation(
			trpc.userSettings.update.mutationOptions(
				useTrpcMutationOptions(userSettingsUpdateOptions),
			),
		);
		const onChange = React.useCallback(
			(nextAutoAccept: boolean) =>
				updateSettingsMutation.mutate({
					type: "manualAcceptDebts",
					value: nextAutoAccept,
				}),
			[updateSettingsMutation],
		);
		const errorButton = React.useMemo(
			() => ({ text: "Reset", onPress: updateSettingsMutation.reset }),
			[updateSettingsMutation],
		);
		return (
			<>
				<Switch
					testID="manual-accept-debts-switch"
					isSelected={settings.manualAcceptDebts}
					onValueChange={onChange}
					thumbIcon={
						updateSettingsMutation.isPending ? <Spinner size="sm" /> : undefined
					}
					isDisabled={updateSettingsMutation.isPending}
				/>
				{updateSettingsMutation.status === "error" ? (
					<ErrorMessage
						message={updateSettingsMutation.error.message}
						button={errorButton}
					/>
				) : null}
			</>
		);
	},
	<SkeletonSwitch />,
);
