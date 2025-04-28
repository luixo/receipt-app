export const serverSettings = {
	timezone: "UTC",
	locale: "en-US",
};

// Timezone and locale on a client should differ from those on a server
// to verify no render mismatch on hydration
export const localSettings = {
	timezone: "America/Los_Angeles",
	locale: "ru-RU",
} satisfies typeof serverSettings;
