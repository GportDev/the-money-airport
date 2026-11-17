/**
 * Production build that transpiles each file on its own. A full `tsc` or `nest build` loads every
 * Stripe and Plaid type definition and needs ~550 MB of heap, more than Render's free 512 MB
 * instance. Type checking stays in `pnpm typecheck`.
 *
 * Usage: pnpm --filter server build:prod
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";

const SERVER_DIR = join(__dirname, "..");

function readCompilerConfig() {
	const configPath = join(SERVER_DIR, "tsconfig.json");
	const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
	if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
	return ts.parseJsonConfigFileContent(config, ts.sys, SERVER_DIR);
}

function outputPathFor(sourcePath: string, rootDir: string, outDir: string) {
	return join(outDir, relative(rootDir, sourcePath)).replace(/\.ts$/, ".js");
}

function build() {
	const { options, fileNames } = readCompilerConfig();
	const rootDir = options.rootDir ?? join(SERVER_DIR, "src");
	const outDir = options.outDir ?? join(SERVER_DIR, "dist");
	const compilerOptions = { ...options, declaration: false, sourceMap: false, incremental: false };

	rmSync(outDir, { recursive: true, force: true });
	for (const sourcePath of fileNames) {
		if (sourcePath.endsWith(".d.ts")) continue;
		const { outputText, diagnostics } = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
			compilerOptions,
			fileName: sourcePath,
			reportDiagnostics: true,
		});
		if (diagnostics?.length) {
			const message = ts.formatDiagnostics(diagnostics, {
				getCanonicalFileName: (name) => name,
				getCurrentDirectory: () => SERVER_DIR,
				getNewLine: () => "\n",
			});
			throw new Error(message);
		}
		const outputPath = outputPathFor(sourcePath, rootDir, outDir);
		mkdirSync(dirname(outputPath), { recursive: true });
		writeFileSync(outputPath, outputText);
	}
	console.info(`Transpiled ${fileNames.length} files to ${relative(SERVER_DIR, outDir)}/`);
}

build();
