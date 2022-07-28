import React from "react";

import { Body } from "./body";
import { Child, Props as ChildProps } from "./child";
import { Footer } from "./footer";
import { Header } from "./header";
import { Style } from "./style";
import { Table } from "./table";

type Props = {
	title: string;
	children: ChildProps[];
	footerChildren?: ChildProps[];
};

export const Email: React.FC<Props> = ({ title, children, footerChildren }) => (
	<>
		<Style
			selector="body"
			styles={{
				backgroundColor: "#eaebed",
				fontFamily: "sans-serif",
				fontSize: "14px",
				lineHeight: "1.4",
				margin: "0",
				padding: "0",
				WebkitFontSmoothing: "antialiased",
				MsTextSizeAdjust: "100%",
				WebkitTextSizeAdjust: "100%",
			}}
		/>
		<Style
			selector="h1,h2,h3,h4"
			styles={{
				color: "#06090f",
				fontFamily: "sans-serif",
				fontWeight: "400",
				lineHeight: "1.4",
				margin: "0",
			}}
		/>
		<Style
			selector="p"
			styles={{
				fontFamily: "sans-serif",
				fontSize: "14px",
				fontWeight: "normal",
				margin: 0,
				marginBottom: "15px",
			}}
			media={{
				"@media only screen and (max-width: 620px)": {
					fontSize: "16px !important",
				},
			}}
		/>
		<Style
			selector="a"
			styles={{
				color: "#ec0867",
				textDecoration: "underline",
			}}
			media={{
				"@media only screen and (max-width: 620px)": {
					fontSize: "16px !important",
				},
			}}
		/>
		<Style
			selector="td"
			media={{
				"@media only screen and (max-width: 620px)": {
					fontSize: "16px !important",
				},
			}}
		/>
		<Style
			selector="span"
			media={{
				"@media only screen and (max-width: 620px)": {
					fontSize: "16px !important",
				},
			}}
		/>
		<Style
			selector=".container"
			styles={{
				display: "block",
				margin: "0 auto !important",
				maxWidth: "580px",
				padding: "10px",
				width: "580px",
			}}
			media={{
				"@media only screen and (max-width: 620px)": {
					padding: "0 !important",
					width: "100% !important",
				},
			}}
		/>
		<Style
			selector=".content"
			styles={{
				boxSizing: "border-box",
				display: "block",
				margin: "0 auto",
				maxWidth: "580px",
				padding: "10px",
			}}
			media={{
				"@media only screen and (max-width: 620px)": {
					padding: "0 !important",
				},
			}}
		/>
		<Style
			selector=".preheader"
			styles={{
				color: "transparent",
				display: "none",
				height: 0,
				maxHeight: 0,
				maxWidth: 0,
				opacity: 0,
				overflow: "hidden",
				msoHide: "all",
				visibility: "hidden",
				width: 0,
			}}
		/>
		<Table className="body">
			<Table.Row>
				<td>&nbsp;</td>
				<td className="container">
					<Header />
					<div className="content">
						<span className="preheader">{title}</span>
						<Body>
							{children.map((child, index) => (
								// That's one-time render, we don't care about rerenders
								// eslint-disable-next-line react/no-array-index-key
								<Child key={index} {...child} />
							))}
						</Body>
						<Footer>{footerChildren}</Footer>
					</div>
				</td>
				<td>&nbsp;</td>
			</Table.Row>
		</Table>
	</>
);
