// We polyfill Temporal strictly before any module can use it. Only Safari now requires this polyfill of the baseline browsers.
import "~utils/temporal-polyfill";

void import("./hydrate");
