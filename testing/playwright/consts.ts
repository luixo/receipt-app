export const serverSettings = {
	timezone: "UTC",
	locale: "ru-RU",
};

// Timezone and locale on a client should differ from those on a server
// to verify no render mismatch on hydration
export const localSettings = {
	timezone: "America/Los_Angeles",
	locale: "en-US",
} satisfies typeof serverSettings;
