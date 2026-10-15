import process from "node:process";

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account?.trim()) {
	throw new Error("Missing repository variable CLOUDFLARE_ACCOUNT_ID");
}
if (!token?.trim()) {
	throw new Error("Missing repository secret CLOUDFLARE_API_TOKEN");
}

const REPORT_NAME =
	/^receipt-ci-(?:backend|playwright|frontend)-(?:pr|run)-[1-9][0-9]*$/;
const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/workers/scripts`;

const request = async <T>(path: string, method: string) => {
	const response = await fetch(`${BASE_URL}${path}`, {
		method,
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) {
		throw new Error(`Cloudflare ${method} ${path}: HTTP ${response.status}`);
	}
	const body = await response.text();
	if (!body) {
		return;
	}
	const data = JSON.parse(body) as {
		success: unknown;
		errors: unknown;
		result: T;
	};
	if (data.success !== true) {
		throw new Error(
			`Cloudflare ${method} ${path}: ${JSON.stringify(data.errors)}`,
		);
	}
	return data.result;
};

const workers = await request<{ id: string }[]>("", "GET");
if (!Array.isArray(workers)) {
	throw new TypeError("Invalid Cloudflare Worker list");
}
const cutoff = Temporal.Now.instant().subtract({
	hours: 30 * 24,
}).epochMilliseconds;

let deleted = 0;
for (const worker of workers) {
	if (!REPORT_NAME.test(worker.id)) {
		continue;
	}
	const path = `/${encodeURIComponent(worker.id)}`;
	const result = await request<{ deployments: { created_on: string }[] }>(
		`${path}/deployments`,
		"GET",
	);
	if (!Array.isArray(result?.deployments)) {
		throw new TypeError(`Invalid deployment list for ${worker.id}`);
	}
	if (result.deployments.length === 0) {
		console.warn(`Skipping ${worker.id}: no deployment date available`);
		continue;
	}
	const dates = result.deployments.map((deployment) =>
		Date.parse(deployment.created_on),
	);
	if (dates.some((date) => !Number.isFinite(date))) {
		throw new Error(`Invalid deployment date for ${worker.id}`);
	}
	if (Math.max(...dates) >= cutoff) {
		continue;
	}
	await request(path, "DELETE");
	console.info(`Deleted ${worker.id}`);
	deleted += 1;
}
console.info(`Deleted ${deleted} expired report Worker(s)`);
