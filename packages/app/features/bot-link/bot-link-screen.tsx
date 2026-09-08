import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { EmptyCard } from "~app/components/empty-card";
import { ErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCMutationResult } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { ButtonLink } from "~components/link";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { options as sessionsLinkBotOptions } from "~mutations/sessions/link-bot";

declare global {
	// Global augmentation requires `interface`, not `type`.
	// oxlint-disable-next-line typescript/consistent-type-definitions
	interface Window {
		Telegram?: { WebApp?: { initData: string } };
	}
}

// Unlike other packages/app screens, this one is inherently web/Telegram-only
// (no mobile Mini App equivalent exists), so reading `window` directly here
// rather than threading it through a cross-platform context is deliberate.
// Guarded because this runs during SSR too, where `window` doesn't exist.
// oxlint-disable no-restricted-globals
const getInitData = () =>
	typeof window === "undefined" ? undefined : window.Telegram?.WebApp?.initData;
// oxlint-enable no-restricted-globals

export const BotLink: React.FC<{
	linkBotMutation: TRPCMutationResult<"sessions.linkBot">;
	initData: string;
}> = ({ linkBotMutation, initData }) => {
	const { t } = useTranslation("bot-link");
	switch (linkBotMutation.status) {
		case "pending":
			return <Spinner size="lg" />;
		case "error":
			return (
				<ErrorMessage
					message={linkBotMutation.error.message}
					button={{
						text: t("retryButton"),
						onPress: () => linkBotMutation.mutate({ initData }),
					}}
				/>
			);
		case "idle":
			return null;
		case "success":
			return (
				<>
					<Text variant="h4">{t("success.header")}</Text>
					<ButtonLink to="/" color="primary">
						{t("success.home")}
					</ButtonLink>
				</>
			);
	}
};

export const BotLinkScreen = () => {
	const { t } = useTranslation("bot-link");
	const trpc = useTRPC();
	const linkBotMutation = useMutation(
		trpc.sessions.linkBot.mutationOptions(
			useTrpcMutationOptions(sessionsLinkBotOptions),
		),
	);
	// `undefined` on both the server and the initial client render (`window`
	// isn't available during SSR) - populated from the effect below once
	// mounted, to avoid a hydration mismatch.
	const [initData, setInitData] = React.useState<string | undefined>();
	React.useEffect(() => {
		setInitData(getInitData());
	}, []);
	const linkBot = React.useCallback(() => {
		if (!initData || linkBotMutation.status !== "idle") {
			return;
		}
		linkBotMutation.mutate({ initData });
	}, [initData, linkBotMutation]);
	React.useEffect(linkBot, [linkBot]);

	return (
		<>
			<PageHeader>{t("header")}</PageHeader>
			{initData ? (
				<BotLink linkBotMutation={linkBotMutation} initData={initData} />
			) : (
				<EmptyCard title={t("error.title")}>
					<Text variant="h3" className="text-center">
						{t("error.description")}
					</Text>
				</EmptyCard>
			)}
		</>
	);
};
