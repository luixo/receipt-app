import findFreePorts from "find-free-ports";

export const getFreePort = async () => {
	// remove after closed: https://github.com/samvv/node-find-free-ports/issues/19
	const ports = await findFreePorts(1, { jobCount: 1 });
	const port = ports[0];
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return port!;
};
