import istanbulCoverage from "istanbul-lib-coverage";
import type { FileCoverageData } from "istanbul-lib-coverage";
import { fromEntries, isNonNullish } from "remeda";

import { baseLogger } from "~web/providers/logger";

import type { RestoreRangeEnd } from "./generated-code";
import { analyzeGeneratedCode } from "./generated-code";
import type { LoadedScript } from "./loaders";
import { isReportedFile } from "./paths";
import type { FilePlan } from "./project";
import { countFile, planFile, sumCounts } from "./project";
import type { V8FunctionCoverage } from "./ranges";
import { createCountAt } from "./ranges";
import { getSkeleton } from "./skeleton";
import { indexScript } from "./source-map";

type ScriptPlan = {
	files: FilePlan[];
	restoreRangeEnd: RestoreRangeEnd;
};

export type ProjectorOptions = {
	// Which repository files to collect coverage for
	include?: (repoPath: string) => boolean;
};

// Projects V8 coverage of generated scripts onto canonical coverage of original files.
// The same script may be added many times (e.g. once per test), its plan is reused.
export const createProjector = ({
	include = isReportedFile,
}: ProjectorOptions = {}) => {
	const scriptPlans = new Map<string, Promise<ScriptPlan | undefined>>();
	const coverages = new Map<string, FileCoverageData>();

	const planScript = async (
		scriptUrl: string,
		loadScript: () => Promise<LoadedScript | undefined>,
	): Promise<ScriptPlan | undefined> => {
		const script = await loadScript();
		if (!script) {
			return undefined;
		}
		const { positionsByFile, findForeignOffsetBefore, getSourceContents } =
			indexScript(script.code, script.map);
		const filePlans = await Promise.all(
			[...positionsByFile]
				.filter(([repoPath]) => include(repoPath))
				.map(async ([repoPath, positions]) => {
					const skeleton = await getSkeleton(repoPath);
					if (!skeleton) {
						return undefined;
					}
					// Source map positions are meaningless for a different text,
					// e.g. when a plugin serves a virtual module in place of a file
					if (
						getSourceContents(repoPath).some(
							(content) => content !== skeleton.code,
						)
					) {
						baseLogger.warn(
							`Skipping coverage of ${repoPath} in ${scriptUrl}: source map was generated for a different source`,
						);
						return undefined;
					}
					return { skeleton, positions };
				}),
		);
		const validFilePlans = filePlans.filter(isNonNullish);
		if (validFilePlans.length === 0) {
			return undefined;
		}
		// Generated code is parsed only if it has files we collect coverage for
		const { restoreRangeEnd, findFunctions } = analyzeGeneratedCode(
			script.code,
		);
		return {
			files: validFilePlans.map(({ skeleton, positions }) =>
				planFile(skeleton, positions, {
					findForeignOffsetBefore,
					findFunctions,
				}),
			),
			restoreRangeEnd,
		};
	};

	return {
		add: async (
			scriptUrl: string,
			loadScript: () => Promise<LoadedScript | undefined>,
			functions: V8FunctionCoverage[],
		) => {
			let scriptPlan = scriptPlans.get(scriptUrl);
			if (!scriptPlan) {
				scriptPlan = planScript(scriptUrl, loadScript);
				scriptPlans.set(scriptUrl, scriptPlan);
			}
			const plan = await scriptPlan;
			if (!plan) {
				return;
			}
			const countAt = createCountAt(functions, plan.restoreRangeEnd);
			for (const filePlan of plan.files) {
				const coverage =
					coverages.get(filePlan.skeleton.coverage.path) ??
					filePlan.skeleton.coverage;
				coverages.set(coverage.path, {
					...coverage,
					...sumCounts(coverage, countFile(filePlan, countAt)),
				});
			}
		},
		toCoverageMap: () =>
			istanbulCoverage.createCoverageMap(
				structuredClone(fromEntries([...coverages])),
			),
	};
};
