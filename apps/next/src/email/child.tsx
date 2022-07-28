import React from "react";

import { Button } from "./button";
import { Style } from "./style";

type TextChild = {
	type: "text";
	size?: "h1" | "h2" | "h3";
	text: string;
};

type ActionChild = {
	type: "action";
	href: string;
	text: string;
};

export type Props = TextChild | ActionChild;

/* eslint-disable react/destructuring-assignment */
export const Child: React.FC<Props> = (props) => {
	switch (props.type) {
		case "text": {
			switch (props.size) {
				case "h1":
					return (
						<>
							<Style
								selector="table[class=body] h1"
								media={{
									"@media only screen and (max-width: 620px)": {
										fontSize: "28px !important",
										marginBottom: "10px !important",
									},
								}}
							/>
							<h1>{props.text}</h1>
						</>
					);
				default:
					return <p>{props.text}</p>;
			}
		}
		case "action":
			return <Button href={props.href} text={props.text} />;
		default:
			return null;
	}
};
/* eslint-enable react/destructuring-assignment */
