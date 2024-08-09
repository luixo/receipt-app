import concurrently from "concurrently";
import { findFreePorts } from "find-free-ports";
import { connect } from "ngrok";
import assert from "node:assert";

const main = async () => {
	// remove after closed: https://github.com/samvv/node-find-free-ports/issues/19
	const port = (await findFreePorts(1, { startPort: 3000, jobCount: 1 }))[0];
	assert(port);
	let host = "localhost";
	const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
	if (!ngrokAuthToken) {
		console.warn("No NGROK_AUTH_TOKEN environment variable provided!");
		console.warn("You will not be able to connect to backend on mobile");
	} else {
		host = await connect({
			addr: port,
			region: "eu",
			authtoken: ngrokAuthToken,
		});
		console.log(`Ngrok host started: ${host} at port ${port}`);
	}
	const result = concurrently(
		[
			{
				name: "expo",
				command: "yarn workspace @ra/mobile dev",
				env: {
					BACKEND_HOST: host,
				},
				prefixColor: "blue",
			},
			{
				name: "web",
				command: "yarn workspace @ra/web dev",
				env: {
					PORT: port,
				},
				prefixColor: "green",
			},
		],
		{ raw: true },
	);
	process.on("SIGINT", () => {
		console.log("Shutting down..");
		result.commands.forEach((command) => {
			command.kill();
			console.log(`${command.name} shut down`);
		});
		console.log("All processes shut down");
		process.exit(0);
	});
};

void main();
