import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";

import { Peer, SkeletonPeer } from "~app/components/app/peer";
import { EmptyCard } from "~app/components/empty-card";
import {
	PaginationBlock,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { SuspendedOverlay } from "~app/components/pagination-overlay";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type {
	SearchParamState,
	SearchParamStateDefaulted,
} from "~app/utils/navigation";
import { useTRPC } from "~app/utils/trpc";
import { Icon } from "~components/icons";
import { ButtonLink, Link } from "~components/link";
import { Text } from "~components/text";
import type { PeerId } from "~db/ids";

const PeerPreview = suspendedFallback<{
	id: PeerId;
}>(
	({ id }) => {
		const trpc = useTRPC();
		const { data: peer } = useSuspenseQuery(
			trpc.peers.get.queryOptions({ id }),
		);
		return (
			<Link to="/peers/$id" params={{ id: peer.id }}>
				<Peer
					id={peer.id}
					name={peer.name}
					connectedAccount={peer.connectedAccount}
				/>
			</Link>
		);
	},
	<SkeletonPeer className="self-start" />,
);

type Props = {
	limitState: SearchParamStateDefaulted<"/_protected/peers/", "limit">;
	offsetState: SearchParamState<"/_protected/peers/", "offset">;
};

export const Peers: React.FC<Props> = suspendedFallback(
	({ limitState: [limit, setLimit], offsetState }) => {
		const { t } = useTranslation("peers");
		const trpc = useTRPC();
		const { data, onPageChange, isPending } = useCursorPaging(
			trpc.peers.getPaged,
			{ limit },
			offsetState,
		);

		if (!data.count) {
			return (
				<EmptyCard title={t("list.empty.title")}>
					<Trans
						t={t}
						i18nKey="list.empty.message"
						components={{
							text: <Text variant="h3" />,
							icon: (
								<ButtonLink
									color="primary"
									to="/peers/add"
									title={t("list.addPeer.button")}
									variant="bordered"
									className="mx-2"
									isIconOnly
								>
									<Icon name="add" className="size-6" />
								</ButtonLink>
							),
						}}
					/>
				</EmptyCard>
			);
		}

		return (
			<>
				<PaginationBlock
					totalCount={data.count}
					limit={limit}
					setLimit={setLimit}
					offset={offsetState[0]}
					onPageChange={onPageChange}
				/>
				<SuspendedOverlay isPending={isPending}>
					<>
						{data.items.map((id) => (
							<PeerPreview key={id} id={id} />
						))}
					</>
				</SuspendedOverlay>
			</>
		);
	},
	({ limitState }) => (
		<>
			<PaginationBlockSkeleton limit={limitState[0]} />
			<SuspendedOverlay isPending>
				<>
					{Array.from({ length: limitState[0] }).map((_, index) => (
						// oxlint-disable-next-line react/no-array-index-key
						<SkeletonPeer key={index} className="self-start" />
					))}
				</>
			</SuspendedOverlay>
		</>
	),
);
