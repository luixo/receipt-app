import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { type TRPCQueryOutput, trpc } from "~app/trpc";
import {
	Button,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Text,
} from "~components";
import { CrossWaitIcon, WaitIcon } from "~components/icons";
import { nonNullishGuard } from "~utils";

type Props = {
	participants: TRPCQueryOutput<"receipts.get">["participants"];
} & Omit<
	React.ComponentProps<typeof Button>,
	"onClick" | "color" | "isIconOnly"
>;

export const ReceiptResolvedParticipantsButton: React.FC<Props> = ({
	participants,
	...props
}) => {
	const [popoverOpen, setPopoverOpen] = React.useState(false);
	const participantQueries = trpc.useQueries((t) =>
		participants.map((participant) => t.users.get({ id: participant.userId })),
	);
	const connectedParticipants = participantQueries
		.map((participantQuery) => {
			if (!participantQuery.data?.connectedAccount) {
				return null;
			}
			const matchedParticipant = participants.find(
				({ userId }) => userId === participantQuery.data?.id,
			);
			if (!matchedParticipant) {
				return null;
			}
			return {
				userId: matchedParticipant.userId,
				resolved: matchedParticipant.resolved,
			};
		})
		.filter(nonNullishGuard);
	if (connectedParticipants.length === 0) {
		return (
			<Button
				variant="light"
				{...props}
				isDisabled
				isIconOnly
				startContent={<WaitIcon size={24} />}
			/>
		);
	}
	const notResolvedParticipants = connectedParticipants.filter(
		(participant) => !participant.resolved,
	);
	const resolvedParticipants = connectedParticipants.filter(
		(participant) => participant.resolved,
	);
	return (
		<Popover
			isOpen={popoverOpen}
			onOpenChange={setPopoverOpen}
			placement="left"
		>
			<PopoverTrigger>
				<Button
					variant="light"
					{...props}
					color={popoverOpen ? "secondary" : undefined}
					isLoading={props.isLoading}
					isDisabled={props.isDisabled}
					isIconOnly
					startContent={
						notResolvedParticipants?.length === 0 ? (
							<WaitIcon size={24} />
						) : (
							<CrossWaitIcon size={24} />
						)
					}
				>
					{!notResolvedParticipants || notResolvedParticipants.length === 0
						? null
						: notResolvedParticipants.length}
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				<View className="gap-6 p-4">
					{notResolvedParticipants && notResolvedParticipants.length !== 0 ? (
						<View className="items-start gap-2">
							<Text className="font-medium">Not resolved participants: </Text>
							{notResolvedParticipants.map((participant) => (
								<LoadableUser
									key={participant.userId}
									id={participant.userId}
								/>
							))}
						</View>
					) : null}
					{resolvedParticipants && resolvedParticipants.length !== 0 ? (
						<View className="items-start gap-2">
							<Text className="font-medium">Resolved participants: </Text>
							{resolvedParticipants.map((participant) => (
								<LoadableUser
									key={participant.userId}
									id={participant.userId}
								/>
							))}
						</View>
					) : null}
				</View>
			</PopoverContent>
		</Popover>
	);
};
