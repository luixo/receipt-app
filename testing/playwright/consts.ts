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

const PORT = Number(process.env.PORT) || 3000;
export const urlSettings = {
	port: PORT,
	baseUrl: `http://localhost:${PORT}/`,
};

export const serverName = `PW:Server`;
