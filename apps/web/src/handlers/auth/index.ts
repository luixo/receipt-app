import { procedure as confirmEmail } from "./confirm-email";
import { procedure as login } from "./login";
import { procedure as register } from "./register";
import { procedure as resetPassword } from "./reset-password";
import { procedure as voidUser } from "./void-user";

export const router = {
	login,
	register,
	resetPassword,
	confirmEmail,
	voidUser,
};
