import React from "react";

import { Style } from "./style";
import { Table } from "./table";

export const Header = () => (
	<>
		<Style selector=".header" styles={{ padding: "20px 0" }} />
		<Style
			selector="h1"
			styles={{
				fontSize: "35px",
				fontWeight: "300",
				textAlign: "center",
				textTransform: "capitalize",
			}}
		/>
		<Style selector=".align-center" styles={{ textAlign: "center" }} />
		<div className="header">
			<Table width="100%">
				<Table.Row>
					<td className="align-center" width="100%">
						<h1>Receipt App</h1>
					</td>
				</Table.Row>
			</Table>
		</div>
	</>
);
