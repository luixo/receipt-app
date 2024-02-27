import { t } from "~web/handlers/trpc";

import { procedure as changeAvatar } from "./change-avatar";
import { procedure as changeName } from "./change-name";
import { procedure as changePassword } from "./change-password";
import { procedure as get } from "./get";
import { procedure as logout } from "./logout";
import { procedure as resendEmail } from "./resend-email";

export const router = t.router({
	get,
	logout,
	changeName,
	changePassword,
	changeAvatar,
	resendEmail,
});
