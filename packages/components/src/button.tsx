import type { ButtonProps } from "@heroui/button";
import { Button as ButtonRaw } from "@heroui/button";
import type { InternalForwardRefRenderFunction } from "@heroui/system";

export { ButtonGroup } from "@heroui/button";
export const Button = ((props) => (
	<ButtonRaw {...props} />
)) as InternalForwardRefRenderFunction<
	"button",
	Omit<ButtonProps, "href">,
	"href"
>;
