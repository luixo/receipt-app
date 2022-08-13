import concurrently from "concurrently";
import getPort, { portNumbers } from "get-port";
import ngrok from "ngrok";

const main = async () => {
	const port = await getPort({
		port: portNumbers(3000, 3100),
	});
	let host = "localhost";
	const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
	if (!ngrokAuthToken) {
		console.warn("No NGROK_AUTH_TOKEN environment variable provided!");
		console.warn("You will not be able to connect to backend on mobile");
	} else {
		host = await ngrok.connect({
			addr: port,
			region: "eu",
			authtoken: ngrokAuthToken,
		});
		console.log(`Ngrok host started: ${host} at port ${port}`);
	}
	const result = concurrently([
		{
			name: "expo",
			command: "yarn native:dev",
			env: {
				BACKEND_HOST: host,
			},
			prefixColor: "blue",
		},
		{
			name: "next",
			command: "yarn web:dev",
			env: {
				PORT: port,
			},
			prefixColor: "green",
		},
	]);
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
