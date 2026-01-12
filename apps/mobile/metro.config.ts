import { getDefaultConfig } from "expo/metro-config.js";

const projectRoot = import.meta.dirname;
const config = getDefaultConfig(projectRoot, {});

export default config;
