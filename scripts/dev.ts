import concurrently from "concurrently";
import { connect } from "ngrok";

import { getFreePort } from "~utils/port";

const main = async () => {
	const port = await getFreePort();
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
		// eslint-disable-next-line n/no-process-exit
		process.exit(0);
	});
};

void main();
