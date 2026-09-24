import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { OutboundIntention } from "~app/trpc-types";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { Input } from "~components/input";
import { SkeletonInput } from "~components/skeleton-input";
import { View } from "~components/view";
import { options as userConnectionsRemoveOptions } from "~mutations/user-connection-intentions/remove";

export const SkeletonOutboundConnectionIntention: React.FC = () => {
	const { t } = useTranslation("peers");
	return (
		<SkeletonInput
			skeletonClassName="w-48"
			endContent={
				<Button
					title={t("intentions.unlinkPeerButton")}
					variant="light"
					isIconOnly
					isDisabled
				>
					<Icon name="unlink" className="size-6" />
				</Button>
			}
		/>
	);
};

type Props = {
	intention: OutboundIntention;
};

export const OutboundConnectionIntention: React.FC<Props> = ({ intention }) => {
	const trpc = useTRPC();
	const { t } = useTranslation("peers");
	const removeConnectionMutation = useMutation(
		trpc.userConnectionIntentions.remove.mutationOptions(
			useTrpcMutationOptions(userConnectionsRemoveOptions),
		),
	);
	const removeConnection = React.useCallback(() => {
		removeConnectionMutation.mutate({
			targetUserId: intention.user.id,
		});
	}, [removeConnectionMutation, intention.user.id]);

	return (
		<View testID="outbound-connection-intention">
			<Input
				value={intention.user.email}
				label={intention.peer.name}
				isReadOnly
				mutation={removeConnectionMutation}
				endContent={
					<Button
						title={t("intentions.unlinkPeerButton")}
						variant="light"
						isLoading={removeConnectionMutation.isPending}
						isIconOnly
						onPress={removeConnection}
					>
						<Icon name="unlink" className="size-6" />
					</Button>
				}
			/>
		</View>
	);
};
