import React from "react";
import { View } from "react-native";

import {
	Button,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Spacer,
} from "@nextui-org/react-tailwind";
import {
	MdHourglassDisabled as CrossWaitIcon,
	MdHourglassEmpty as WaitIcon,
} from "react-icons/md";

import { LoadableUser } from "app/components/app/loadable-user";
import { Text } from "app/components/base/text";
import { trpc } from "app/trpc";
import type { ReceiptsId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
} & Omit<
	React.ComponentProps<typeof Button>,
	"onClick" | "color" | "isIconOnly"
>;

export const ReceiptResolvedParticipantsButton: React.FC<Props> = ({
	receiptId,
	...props
}) => {
	const [popoverOpen, setPopoverOpen] = React.useState(false);
	const query = trpc.receipts.getResolvedParticipants.useQuery({ receiptId });
	const notResolvedParticipants = query.data?.filter(
		(participant) => !participant.resolved,
	);
	const resolvedParticipants = query.data?.filter(
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
					isLoading={query.isLoading || props.isLoading}
					isDisabled={
						query.status !== "success" ||
						query.data.length === 0 ||
						props.isDisabled
					}
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
				<View className="p-4">
					{notResolvedParticipants && notResolvedParticipants.length !== 0 ? (
						<>
							<Text className="font-medium">Not resolved participants: </Text>
							<Spacer y={4} />
							<View className="items-start">
								{notResolvedParticipants.map((participant, index) => (
									<React.Fragment
										key={participant.localUserId || participant.remoteUserId}
									>
										{index === 0 ? null : <Spacer y={2} />}
										<LoadableUser
											id={participant.localUserId || participant.remoteUserId}
										/>
									</React.Fragment>
								))}
							</View>
						</>
					) : null}
					{notResolvedParticipants &&
					notResolvedParticipants.length !== 0 &&
					resolvedParticipants &&
					resolvedParticipants.length !== 0 ? (
						<Spacer y={6} />
					) : null}
					{resolvedParticipants && resolvedParticipants.length !== 0 ? (
						<>
							<Text className="font-medium">Resolved participants: </Text>
							<Spacer y={4} />
							<View className="items-start">
								{resolvedParticipants?.map((participant, index) => (
									<React.Fragment
										key={participant.localUserId || participant.remoteUserId}
									>
										{index === 0 ? null : <Spacer y={2} />}
										<LoadableUser
											id={participant.localUserId || participant.remoteUserId}
										/>
									</React.Fragment>
								))}
							</View>
						</>
					) : null}
				</View>
			</PopoverContent>
		</Popover>
	);
};
