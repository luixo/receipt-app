import { isTMA } from "@telegram-apps/sdk-react";
import { mockTelegramEnvExtended } from "telegram-mock-init-data";

declare global {
	// Global augmentation requires `interface`, not `type`.
	// oxlint-disable-next-line typescript/consistent-type-definitions
	interface Window {
		Telegram?: { WebApp?: { initData: string } };
	}
}

// Reading `window` directly here (rather than threading it through a
// cross-platform context) is deliberate - this is inherently web/Telegram
// only, no mobile Mini App equivalent exists. Guarded because this can run
// during SSR too, where `window` doesn't exist.
// oxlint-disable no-restricted-globals
export const getTelegramInitData = async () => {
	if (typeof window === "undefined") {
		return;
	}
	if (isTMA()) {
		return window.Telegram?.WebApp?.initData;
	}
	const launchParams = await mockTelegramEnvExtended({
		user: {
			id: 123_456,
			first_name: "Иван",
			last_name: "Петров",
			username: "ivan_petrov",
			language_code: "ru",
			is_premium: true,
		},
		botToken: "YOUR_BOT_TOKEN",
		setupEnvironment: true,
	});
	return launchParams;
};
// oxlint-enable no-restricted-globals
