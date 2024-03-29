import React from "react";

import { Button } from "./button";
import { Style } from "./style";

type TextChild = {
	type: "text";
	size?: "h1" | "h3";
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
				case "h3":
					return (
						<>
							<Style
								selector="table[class=body] h3"
								media={{
									"@media only screen and (max-width: 620px)": {
										fontSize: "22px !important",
										marginBottom: "10px !important",
									},
								}}
							/>
							<h3>{props.text}</h3>
						</>
					);
				default:
					return <p>{props.text}</p>;
			}
		}
		case "action":
			return <Button href={props.href} text={props.text} />;
	}
};
/* eslint-enable react/destructuring-assignment */
