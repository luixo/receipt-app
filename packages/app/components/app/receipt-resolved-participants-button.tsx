import React from "react";

import { Popover, Spacer, Text, styled } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import {
	MdHourglassDisabled as CrossWaitIcon,
	MdHourglassEmpty as WaitIcon,
} from "react-icons/md";

import { LoadableUser } from "app/components/app/loadable-user";
import { trpc } from "app/trpc";
import type { ReceiptsId } from "next-app/db/models";

const Wrapper = styled("div", {
	p: "$8",
});

const Participants = styled("div");

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
			<Popover.Trigger>
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
			</Popover.Trigger>
			<Popover.Content>
				<Wrapper>
					{notResolvedParticipants && notResolvedParticipants.length !== 0 ? (
						<>
							<Text b>Not resolved participants: </Text>
							<Spacer y={1} />
							<Participants>
								{notResolvedParticipants.map((participant, index) => (
									<React.Fragment
										key={participant.localUserId || participant.remoteUserId}
									>
										{index === 0 ? null : <Spacer y={0.5} />}
										<LoadableUser
											id={participant.localUserId || participant.remoteUserId}
										/>
									</React.Fragment>
								))}
							</Participants>
						</>
					) : null}
					{notResolvedParticipants &&
					notResolvedParticipants.length !== 0 &&
					resolvedParticipants &&
					resolvedParticipants.length !== 0 ? (
						<Spacer y={2} />
					) : null}
					{resolvedParticipants && resolvedParticipants.length !== 0 ? (
						<>
							<Text b>Resolved participants: </Text>
							<Spacer y={1} />
							<Participants>
								{resolvedParticipants?.map((participant, index) => (
									<React.Fragment
										key={participant.localUserId || participant.remoteUserId}
									>
										{index === 0 ? null : <Spacer y={0.5} />}
										<LoadableUser
											id={participant.localUserId || participant.remoteUserId}
										/>
									</React.Fragment>
								))}
							</Participants>
						</>
					) : null}
				</Wrapper>
			</Popover.Content>
		</Popover>
	);
};
