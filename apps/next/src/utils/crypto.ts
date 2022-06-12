import * as crypto from "crypto";

type PasswordData = {
	hash: string;
	salt: string;
};

export const getHash = (password: string, salt: string): string => {
	return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
};

export const generatePasswordData = (password: string): PasswordData => {
	const salt = crypto.randomBytes(64).toString("hex");
	const hash = getHash(password, salt);
	return { salt, hash };
};
