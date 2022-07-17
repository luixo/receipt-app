import { styled, TextLink } from "app/utils/styles";

export const ButtonLink = styled(TextLink)({
	padding: "$s",
	margin: "$s",
	borderRadius: "$medium",
	borderColor: "$primary",
	borderWidth: "$hairline",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	minWidth: "$icon",
	minHeight: "$icon",
});
