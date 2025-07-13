import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { ErrorMessage } from "~app/components/error-message";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTRPC } from "~app/utils/trpc";
import { Spinner } from "~components/spinner";
import { SkeletonSwitch, Switch } from "~components/switch";
import { options as accountSettingsUpdateOptions } from "~mutations/account-settings/update";

export const ManualAcceptDebtsOption = suspendedFallback(
	() => {
		const trpc = useTRPC();
		const { data: settings } = useSuspenseQuery(
			trpc.accountSettings.get.queryOptions(),
		);
		const updateSettingsMutation = useMutation(
			trpc.accountSettings.update.mutationOptions(
				useTrpcMutationOptions(accountSettingsUpdateOptions),
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
