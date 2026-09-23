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
export const getTelegramInitData = () =>
	typeof window === "undefined" ? undefined : window.Telegram?.WebApp?.initData;
// oxlint-enable no-restricted-globals
