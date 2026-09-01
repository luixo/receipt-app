import React from "react";

import { Trans, useTranslation } from "react-i18next";

import { BaseUrlContext } from "./base-url-context";
import type { Props as ChildProps } from "./child";
import { Child } from "./child";
import { Style } from "./style";
import { Table } from "./table";

type Props = {
	children?: ChildProps[];
};

export const Footer: React.FC<Props> = ({ children }) => {
	const baseUrl = React.use(BaseUrlContext);
	const { t } = useTranslation("email");
	return (
		<>
			<Style
				selector=".footer"
				styles={{
					clear: "both",
					marginTop: "10px",
					textAlign: "center",
					width: "100%",
				}}
			/>
			<Style
				selector=".footer td,.footer p,.footer span,.footer a"
				styles={{
					color: "#9a9ea6",
					fontSize: "12px",
					textAlign: "center",
				}}
			/>
			<Style
				selector=".footer-block"
				styles={{
					paddingBottom: "10px",
					paddingTop: "10px",
				}}
			/>
			<div className="footer">
				<Table>
					{children?.map((child, index) => (
						// That's one-time render, we don't care about rerenders
						// oxlint-disable-next-line react/no-array-index-key
						<Table.Row key={index}>
							<td className="footer-block">
								<Child {...child} />
							</td>
						</Table.Row>
					))}
					<Table.Row>
						<td className="footer-block">
							<span className="apple-link">{t("footer.link")}</span>
							<br />
							<Trans
								t={t}
								i18nKey="footer.unsubscribe"
								components={{
									// oxlint-disable-next-line jsx-a11y/anchor-has-content jsx-a11y/control-has-associated-label
									a: <a href={`${baseUrl}unsubscribe`} />,
								}}
							/>
						</td>
					</Table.Row>
					<Table.Row>
						<td className="footer-block powered-by">
							<Trans
								t={t}
								i18nKey="footer.inspiredBy"
								components={{
									// oxlint-disable-next-line jsx-a11y/anchor-has-content jsx-a11y/control-has-associated-label
									a: <a href="https://postdrop.io" />,
								}}
							/>
						</td>
					</Table.Row>
				</Table>
			</div>
		</>
	);
};
