import { test as originalTest } from "~tests/frontend/fixtures";
import type { GeneratePeers } from "~tests/frontend/generators/peers";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import type { ExtractFixture } from "~tests/frontend/types";

type AuthPageResult = Awaited<
	ReturnType<
		ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
	>
>;

type Fixtures = {
	mockBase: (options?: { generatePeers?: GeneratePeers }) => Promise<
		{
			peers: ReturnType<GeneratePeers>;
		} & AuthPageResult
	>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async ({ generatePeers = defaultGeneratePeers } = {}) => {
			const auth = await api.mockUtils.authPage();
			const peers = generatePeers({ faker });
			api.mockUtils.mockPeers(...peers);
			api.mockFirst("peers.getPaged", ({ input }) => ({
				cursor: input.cursor,
				count: peers.length,
				items: peers
					.slice(input.cursor, input.cursor + input.limit)
					.map((peer) => peer.id),
			}));
			return { peers, ...auth };
		}),
});
