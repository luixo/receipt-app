const config = {
	"*.{j,t}s{,x}": ["prettier --write", "bun run lint:fix"],
};

export default config;
