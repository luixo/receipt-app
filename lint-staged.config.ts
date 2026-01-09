const config = {
	"*.{j,t}s{,x}": ["prettier --write", "yarn lint:fix --no-warn-ignored --fix"],
};

export default config;
