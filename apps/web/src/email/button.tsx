import React from "react";

import { BaseUrlContext } from "./base-url-context";
import { Style } from "./style";
import { Table } from "./table";

type Props = {
	href: string;
	text: string;
};

export const Button: React.FC<Props> = ({ href, text }) => {
	const baseUrl = React.use(BaseUrlContext);
	return (
		<>
			<Style
				selector=".btn"
				styles={{ boxSizing: "border-box", width: "100%" }}
			/>
			<Style
				selector=".btn > tbody > tr > td "
				styles={{ paddingBottom: "15px" }}
			/>
			<Style
				selector=".btn table"
				styles={{ minWidth: "auto", width: "auto" }}
				media={{
					"@media only screen and (max-width: 620px)": {
						width: "100% !important",
					},
				}}
			/>
			<Style
				selector=".btn table td"
				styles={{
					backgroundColor: "#ffffff",
					borderRadius: "5px",
					textAlign: "center",
				}}
			/>
			<Style
				selector=".btn a"
				styles={{
					backgroundColor: "#ffffff",
					border: "solid 1px #ec0867",
					borderRadius: "5px",
					boxSizing: "border-box",
					color: "#ec0867",
					cursor: "pointer",
					display: "inline-block",
					fontSize: "14px",
					fontWeight: "bold",
					margin: "0",
					padding: "12px 25px",
					textDecoration: "none",
					textTransform: "capitalize",
				}}
				media={{
					"@media only screen and (max-width: 620px)": {
						width: "100% !important",
					},
				}}
			/>
			<Style
				selector=".btn-primary table td"
				styles={{ backgroundColor: "#ec0867" }}
			/>
			<Style
				selector=".btn-primary a"
				styles={{
					backgroundColor: "#ec0867",
					borderColor: "#ec0867",
					color: "#ffffff",
				}}
			/>
			<Style
				selector=".btn-primary table td:hover"
				styles={{ backgroundColor: "#d5075d !important" }}
			/>
			<Style
				selector=".btn-primary a:hover"
				styles={{
					backgroundColor: "#d5075d !important",
					borderColor: "#d5075d !important",
				}}
			/>
			<Table className="btn btn-primary">
				<tbody>
					<tr>
						<td align="left">
							<Table>
								<tbody>
									<Table.Row>
										<td>
											{" "}
											<a
												href={`${baseUrl}${href}`}
												rel="noreferrer"
												target="_blank"
											>
												{text}
											</a>{" "}
										</td>
									</Table.Row>
								</tbody>
							</Table>
						</td>
					</tr>
				</tbody>
			</Table>
		</>
	);
};
