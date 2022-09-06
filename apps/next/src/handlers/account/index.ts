import { t } from "next-app/handlers/trpc";

import { procedure as changePassword } from "./change-password";
import { procedure as get } from "./get";
import { procedure as logout } from "./logout";
import { procedure as resendEmail } from "./resend-email";

export const router = t.router({
	get,
	logout,
	changePassword,
	resendEmail,
});
