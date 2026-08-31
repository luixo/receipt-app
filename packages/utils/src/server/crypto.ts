import * as crypto from "node:crypto";
import { promisify } from "node:util";

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
