import findFreePorts from "find-free-ports";
import assert from "node:assert";

export const getFreePort = async () => {
	// remove after closed: https://github.com/samvv/node-find-free-ports/issues/19
	const ports = await findFreePorts(1, { jobCount: 1 });
	const [port] = ports;
	assert.ok(port);
	return port;
};
