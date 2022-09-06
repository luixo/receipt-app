import { t } from "next-app/handlers/trpc";

import { procedure as confirmEmail } from "./confirm-email";
import { procedure as login } from "./login";
import { procedure as register } from "./register";
import { procedure as resetPassword } from "./reset-password";
import { procedure as voidAccount } from "./void-account";

export const router = t.router({
	login,
	register,
	resetPassword,
	confirmEmail,
	voidAccount,
});
