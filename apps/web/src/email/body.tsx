import React from "react";

import { Style } from "./style";
import { Table } from "./table";

type Props = {
	children: React.ReactNode;
};

export const Body: React.FC<Props> = ({ children }) => (
	<>
		<Style
			selector=".main"
			styles={{
				background: "#ffffff",
				borderRadius: "3px",
				width: "100%",
			}}
			media={{
				"@media only screen and (max-width: 620px)": {
					borderLeftWidth: "0 !important",
					borderRadius: "0 !important",
					borderRightWidth: "0 !important",
				},
			}}
		/>
		<Style
			selector=".wrapper"
			styles={{
				boxSizing: "border-box",
				padding: "20px",
			}}
			media={{
				"@media only screen and (max-width: 620px)": {
					padding: "10px !important",
				},
			}}
		/>
		<Table
			className="main"
			cellPadding={undefined}
			cellSpacing={undefined}
			style={undefined}
		>
			<Table.Row>
				<td className="wrapper">
					<Table>
						<Table.Row>
							<td>{children}</td>
						</Table.Row>
					</Table>
				</td>
			</Table.Row>
		</Table>
	</>
);
