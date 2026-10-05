// This is needed to mock it in the page fixture in Playwright
// oxlint-disable-next-line typescript/require-await
export const getRandomUUID = async () => crypto.randomUUID();
