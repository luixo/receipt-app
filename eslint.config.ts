import { getConfig } from "@ra/lint/eslint.config";

export default await getConfig(import.meta.dirname);
