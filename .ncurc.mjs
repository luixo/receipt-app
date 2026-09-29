// oxlint-disable import/no-default-export, typescript/no-unsafe-member-access
const config = {
	filterResults: (
		_packageName,
		{ currentVersionSemver, upgradedVersionSemver },
	) =>
		Number(upgradedVersionSemver?.major) >
		Number(currentVersionSemver[0]?.major),
};

export default config;
