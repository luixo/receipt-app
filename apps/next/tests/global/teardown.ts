export default async () => {
	await globalThis.handle.caller.teardown();
	await globalThis.handle.kill();
};
