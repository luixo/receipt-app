import * as crypto from "crypto";

import type { UnauthorizedContext } from "~web/handlers/context";

type PasswordData = {
	hash: string;
	salt: string;
};

export const getHash = (password: string, salt: string): string =>
	crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

export const generatePasswordData = (
	ctx: Pick<UnauthorizedContext, "getSalt">,
	password: string,
): PasswordData => {
	const salt = ctx.getSalt();
	const hash = getHash(password, salt);
	return { salt, hash };
};
