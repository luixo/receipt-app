import * as crypto from "node:crypto";
import { promisify } from "node:util";

import { getNow, toDate } from "~utils/date";
import type { UnauthorizedContext } from "~web/handlers/context";

type PasswordData = {
	hash: string;
	salt: string;
};

const promisifiedPbkdf2 = promisify(crypto.pbkdf2);

export const getHash = async (
	password: string,
	salt: string,
): Promise<string> => {
	const buffer = await promisifiedPbkdf2(password, salt, 1000, 64, "sha512");
	return buffer.toString("hex");
};

export const generatePasswordData = async (
	ctx: Pick<UnauthorizedContext, "getSalt">,
	password: string,
): Promise<PasswordData> => {
	const salt = ctx.getSalt();
	const hash = await getHash(password, salt);
	return { salt, hash };
};

// Telegram Mini App identity verification - see
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

export const verifyTelegramInitData = (
	initData: string,
	botToken: string,
): { id: number } | undefined => {
	const params = new URLSearchParams(initData);
	const hash = params.get("hash");
	if (!hash) {
		return undefined;
	}
	params.delete("hash");
	const dataCheckString = [...params.entries()]
		.toSorted(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
	const secretKey = crypto
		.createHmac("sha256", "WebAppData")
		.update(botToken)
		.digest();
	const computedHash = crypto
		.createHmac("sha256", secretKey)
		.update(dataCheckString)
		.digest("hex");
	const hashBuffer = Buffer.from(hash, "hex");
	const computedHashBuffer = Buffer.from(computedHash, "hex");
	if (
		hashBuffer.length !== computedHashBuffer.length ||
		!crypto.timingSafeEqual(hashBuffer, computedHashBuffer)
	) {
		return undefined;
	}
	const authDate = Number(params.get("auth_date"));
	const nowSeconds =
		toDate.zonedDateTime(getNow.zonedDateTime()).getTime() / 1000;
	if (!authDate || nowSeconds - authDate > INIT_DATA_MAX_AGE_SECONDS) {
		return undefined;
	}
	const userParam = params.get("user");
	if (!userParam) {
		return undefined;
	}
	try {
		const user: unknown = JSON.parse(userParam);
		if (
			!user ||
			typeof user !== "object" ||
			!("id" in user) ||
			typeof user.id !== "number"
		) {
			return undefined;
		}
		return { id: user.id };
	} catch {
		return undefined;
	}
};
