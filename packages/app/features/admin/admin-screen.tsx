import React from "react";

import { PageHeader } from "~app/components/page-header";
import { SSRContext } from "~app/contexts/ssr-context";
import { PRETEND_USER_COOKIE_NAME } from "~app/utils/cookie/pretend-user";
import { Button, Divider, Input, Tab, Tabs } from "~components";
import type { AppPage } from "~utils";

export const AdminScreen: AppPage = () => {
	const {
		[PRETEND_USER_COOKIE_NAME]: [pretendUser, setPretendUser, resetPretendUser],
	} = React.useContext(SSRContext);
	const [email, setEmail] = React.useState<string>(pretendUser.email || "");
	const setPretendEmail = React.useCallback(
		() => setPretendUser({ email }),
		[email, setPretendUser],
	);
	return (
		<>
			<PageHeader>Admin panel</PageHeader>
			<Tabs variant="underlined">
				<Tab key="become" title="Pretend user">
					<div className="flex flex-col items-stretch gap-2">
						{pretendUser.email ? (
							<>
								<Button onClick={resetPretendUser} color="primary">
									Reset to self
								</Button>
								<Divider />
							</>
						) : null}
						<Input
							value={email}
							label="Pretend user email"
							onValueChange={setEmail}
						/>
						<Button onClick={setPretendEmail} color="warning">
							Become
						</Button>
					</div>
				</Tab>
			</Tabs>
		</>
	);
};
