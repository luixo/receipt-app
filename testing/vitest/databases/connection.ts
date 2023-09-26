export type ConnectionData = {
	host: string;
	port: number;
	username: string;
	password: string;
};

export const makeConnectionString = (
	{ username, password, host, port }: ConnectionData,
	databaseName: string,
) => `postgresql://${username}:${password}@${host}:${port}/${databaseName}`;
