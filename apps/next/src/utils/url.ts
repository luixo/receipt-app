export const getBaseUrl = () => {
	const baseUrl = process.env.BASE_URL;
	if (!baseUrl) {
		throw new Error("Expected to have process.env.BASE_URL variable!");
	}
	return baseUrl;
};
