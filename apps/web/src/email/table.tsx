import React from "react";

import { Style } from "./style";

type ElementProps<K extends keyof JSX.IntrinsicElements> = {
	children: React.ReactNode;
} & React.ComponentProps<K>;

const TableRow: React.FC<ElementProps<"tr">> = ({ children, ...props }) => (
	<tr {...props}>{children}</tr>
);

export const Table = ({ children, ...props }: ElementProps<"table">) => (
	<>
		<Style
			selector="table"
			styles={{
				borderCollapse: "separate",
				msoTableLspace: "0pt",
				msoTableRspace: "0pt",
				minWidth: "100%",
				width: "100%",
			}}
		/>
		<Style
			selector="table td"
			styles={{
				fontFamily: "sans-serif",
				fontSize: "14px",
				verticalAlign: "top",
			}}
		/>
		<table
			role="presentation"
			style={{ border: 0 }}
			cellPadding="0"
			cellSpacing="0"
			{...props}
		>
			{children}
		</table>
	</>
);

Table.Row = TableRow;
