import * as crypto from "crypto";
import { v4 } from "uuid";

type PasswordData = {
	hash: string;
	salt: string;
};

export const getHash = (password: string, salt: string): string =>
	crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

export const getUuid = (): string => {
	if (global.testContext) {
		return global.testContext?.random.getUuid();
	}
	return v4();
};

export const generatePasswordData = (password: string): PasswordData => {
	const salt =
		global.testContext?.random.getUuid() ||
		crypto.randomBytes(64).toString("hex");
	const hash = getHash(password, salt);
	return { salt, hash };
};
