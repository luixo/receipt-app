import concurrently from "concurrently";

const main = async () => {
	const port = 3000;
	const url = `http://localhost:${port}`;
	console.log(`Web server started at ${url}`);
	const result = concurrently(
		[
			{
				name: "native",
				command: "yarn native:dev",
				env: {
					EXPO_PUBLIC_API_BASE_URL: url,
				},
				prefixColor: "blue",
			},
			{
				name: "web",
				command: "yarn web:dev",
				env: {
					PORT: port,
				},
				prefixColor: "green",
			},
		],
		{ raw: true, handleInput: true },
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
