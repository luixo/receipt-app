import React from "react";

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
						// eslint-disable-next-line react/no-array-index-key
						<Table.Row key={index}>
							<td className="footer-block">
								<Child {...child} />
							</td>
						</Table.Row>
					))}
					<Table.Row>
						<td className="footer-block">
							<span className="apple-link">Contact us on receipt@luixo.ru</span>
							<br />
							You can click&nbsp;
							<a href={`${baseUrl}unsubscribe`}>unsubscribe</a>, but there is
							nothing to unsubscribe from.
						</td>
					</Table.Row>
					<Table.Row>
						<td className="footer-block powered-by">
							Inspired by <a href="https://postdrop.io">Postdrop</a>.
						</td>
					</Table.Row>
				</Table>
			</div>
		</>
	);
};
