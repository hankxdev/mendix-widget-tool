import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { Command } from "commander";
import { input, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { scaffold, type ScaffoldOptions, type WorkspaceScaffoldOptions } from "./scaffold.js";
import {
    detectWorkspaceMode,
    findWorkspaceRoot,
    initWorkspace,
    readWorkspaceConfig,
    writeWorkspaceConfig,
    discoverWidgets,
    type ScaffoldMode,
    type WorkspaceConfig
} from "./workspace.js";

// Import version from package.json
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
const VERSION = packageJson.version;

function validateWidgetName(name: string): string | true {
    if (!/^[A-Z][a-zA-Z]*$/.test(name)) {
        return "Widget name must be PascalCase using only letters (e.g. MyWidget)";
    }
    return true;
}

function validatePackagePath(path: string): string | true {
    if (!/^([a-zA-Z0-9_-]+\.)*[a-zA-Z0-9_-]+$/.test(path)) {
        return "Package path must be dot-separated identifiers (e.g. com.example)";
    }
    return true;
}

function getGitUser(): string {
    try {
        return execSync("git config user.name", { encoding: "utf-8" }).trim();
    } catch {
        return "";
    }
}

async function promptOptions(cliName?: string): Promise<ScaffoldOptions> {
    const widgetName = cliName ?? await input({
        message: "Widget name (PascalCase):",
        validate: (val) => {
            const result = validateWidgetName(val);
            return result === true ? true : result;
        }
    });

    if (cliName) {
        const valid = validateWidgetName(cliName);
        if (valid !== true) {
            console.error(chalk.red(valid));
            process.exit(1);
        }
    }

    const description = await input({
        message: "Description:",
        default: "A custom Mendix widget"
    });

    const author = await input({
        message: "Author:",
        default: getGitUser()
    });

    const packagePath = await input({
        message: "Package path (namespace):",
        default: "mendix",
        validate: (val) => {
            const result = validatePackagePath(val);
            return result === true ? true : result;
        }
    });

    const needsEntityContext = await confirm({
        message: "Needs entity context?",
        default: true
    });

    const projectPath = await input({
        message: "Mendix project path (relative):",
        default: "../../"
    });

    return {
        widgetName: cliName ?? widgetName,
        description,
        author,
        packagePath,
        needsEntityContext,
        projectPath
    };
}

/**
 * Orchestrates a command across multiple widgets
 */
async function runOrchestratedCommand(
    title: string,
    widgets: string[],
    options: { all?: boolean; fix?: boolean; production?: boolean },
    scriptName: string | ((widget: string) => string),
    successMsg: (widget: string) => string,
    failMsg: (widget: string) => string
): Promise<void> {
    const workspaceRoot = findWorkspaceRoot();
    if (!workspaceRoot) {
        console.error(chalk.red("\n  Not in a workspace. Run this command from workspace root.\n"));
        process.exit(1);
    }

    const config = readWorkspaceConfig(workspaceRoot);
    const widgetNames = getWidgetNames(widgets, !!options.all);

    if (widgetNames.length === 0) {
        console.error(chalk.red(`\n  No widgets specified. Use 'mx-widget-cli ${title.toLowerCase()} <widget>' or '--all'.\n`));
        process.exit(1);
    }

    console.log(chalk.bold(`\n  ${title} ${widgetNames.length} widget(s)...\n`));

    for (const widgetName of widgetNames) {
        const spinner = ora(`${title} ${widgetName}`).start();
        try {
            const script = typeof scriptName === "function" ? scriptName(widgetName) : scriptName;
            execSync(`npm run ${script} --workspace=widgets/${widgetName}`, {
                cwd: workspaceRoot,
                stdio: "pipe"
            });
            spinner.succeed(successMsg(widgetName));
        } catch (err) {
            spinner.fail(failMsg(widgetName));
            console.error(chalk.red(err instanceof Error ? err.message : String(err)));
            process.exit(1);
        }
    }

    console.log(chalk.green("\n  Done!\n"));
}

async function main(): Promise<void> {
    const program = new Command();

    program
        .name("mx-widget-cli")
        .description("Scaffold a modern Mendix pluggable widget project")
        .version(VERSION);

    // Default command - scaffold a standalone widget
    program
        .argument("[widget-name]", "Widget name in PascalCase")
        .option("-d, --description <desc>", "Widget description")
        .option("-a, --author <author>", "Author name")
        .option("-p, --package <path>", "Package path / namespace")
        .option("--no-entity-context", "Widget does not need entity context")
        .option("--project-path <path>", "Relative path to Mendix project")
        .option("--no-install", "Skip npm install")
        .action(async (widgetNameArg, opts) => {
            console.log(chalk.bold("\n  Create Mendix Widget\n"));

            let options: ScaffoldOptions;

            if (widgetNameArg && opts.description && opts.author && opts.package) {
                const valid = validateWidgetName(widgetNameArg);
                if (valid !== true) {
                    console.error(chalk.red(valid));
                    process.exit(1);
                }
                options = {
                    widgetName: widgetNameArg,
                    description: opts.description,
                    author: opts.author,
                    packagePath: opts.package,
                    needsEntityContext: opts.entityContext !== false,
                    projectPath: opts.projectPath ?? "../../"
                };
            } else {
                options = await promptOptions(widgetNameArg);
            }

            const targetDir = resolve(process.cwd(), options.widgetName);

            if (existsSync(targetDir)) {
                console.error(chalk.red(`\n  Directory "${options.widgetName}" already exists.\n`));
                process.exit(1);
            }

            const spinner = ora("Scaffolding widget project...").start();

            try {
                const scaffoldOptions: WorkspaceScaffoldOptions = {
                    ...options,
                    mode: "single"
                };
                await scaffold(targetDir, scaffoldOptions);
                spinner.succeed("Project scaffolded");

                if (opts.install !== false) {
                    const installSpinner = ora("Installing dependencies...").start();
                    try {
                        execSync("npm install", {
                            cwd: targetDir,
                            stdio: "pipe"
                        });
                        installSpinner.succeed("Dependencies installed");
                    } catch {
                        installSpinner.warn("npm install failed - run it manually");
                    }
                }

                console.log(chalk.green("\n  Done! Your widget is ready.\n"));
                console.log(`  ${chalk.bold("cd")} ${options.widgetName}`);
                console.log(`  ${chalk.bold("npm run dev")}        ${chalk.dim("# Rollup watch + Mendix integration")}`);
                console.log(`  ${chalk.bold("npm run dev:preview")} ${chalk.dim("# Vite standalone preview with HMR")}`);
                console.log(`  ${chalk.bold("npm run build")}      ${chalk.dim("# Production build")}`);
                console.log(`  ${chalk.bold("npm test")}           ${chalk.dim("# Run tests")}`);
                console.log();
            } catch (err) {
                spinner.fail("Scaffolding failed");
                console.error(chalk.red(err instanceof Error ? err.message : String(err)));
                process.exit(1);
            }
        });

    // Init command - initialize a workspace
    program
        .command("init")
        .description("Initialize a multi-widget workspace")
        .argument("[directory]", "Directory to initialize (defaults to current directory)")
        .action(async (directory) => {
            const targetDir = resolve(process.cwd(), directory || ".");

            // Check if already in a workspace
            if (detectWorkspaceMode(targetDir) === "workspace") {
                console.error(chalk.red("\n  This directory is already a workspace.\n"));
                process.exit(1);
            }

            try {
                await initWorkspace(targetDir);
            } catch (err) {
                console.error(chalk.red(err instanceof Error ? err.message : String(err)));
                process.exit(1);
            }
        });

    // Add command - add a widget to workspace
    program
        .command("add")
        .description("Add a widget to the workspace")
        .argument("[widget-name]", "Widget name in PascalCase")
        .option("-d, --description <desc>", "Widget description")
        .option("-a, --author <author>", "Author name")
        .option("-p, --package <path>", "Package path / namespace override")
        .option("--no-entity-context", "Widget does not need entity context")
        .option("--project-path <path>", "Mendix project path override")
        .action(async (widgetNameArg, opts) => {
            const mode = detectWorkspaceMode();

            if (mode === "single") {
                console.error(chalk.red("\n  Not in a workspace. Use 'mx-widget-cli init' first or scaffold a standalone widget.\n"));
                process.exit(1);
            }

            const workspaceRoot = findWorkspaceRoot();
            if (!workspaceRoot) {
                console.error(chalk.red("\n  Could not find workspace root.\n"));
                process.exit(1);
            }

            const config = readWorkspaceConfig(workspaceRoot);

            console.log(chalk.bold("\n  Add Widget to Workspace\n"));

            // Prompt for widget details
            const widgetName = widgetNameArg ?? await input({
                message: "Widget name (PascalCase):",
                validate: (val) => {
                    const result = validateWidgetName(val);
                    return result === true ? true : result;
                }
            });

            if (widgetNameArg) {
                const valid = validateWidgetName(widgetNameArg);
                if (valid !== true) {
                    console.error(chalk.red(valid));
                    process.exit(1);
                }
            }

            // Check if widget already exists
            const existingWidgets = discoverWidgets(workspaceRoot);
            if (existingWidgets.includes(widgetName)) {
                console.error(chalk.red(`\n  Widget "${widgetName}" already exists in workspace.\n`));
                process.exit(1);
            }

            const description = opts.description ?? await input({
                message: "Description:",
                default: "A custom Mendix widget"
            });

            const author = opts.author ?? await input({
                message: "Author:",
                default: getGitUser()
            });

            const packagePath = opts.package ?? config.defaultPackagePath;
            const projectPath = opts.projectPath ?? config.mendixProjectPath;

            const needsEntityContext = opts.entityContext !== false && (opts.entityContext === true || await confirm({
                message: "Needs entity context?",
                default: true
            }));

            const options: WorkspaceScaffoldOptions = {
                widgetName,
                description,
                author,
                packagePath,
                needsEntityContext,
                projectPath,
                mode: "workspace",
                workspaceRoot
            };

            const targetDir = join(workspaceRoot, "widgets", widgetName);

            if (existsSync(targetDir)) {
                console.error(chalk.red(`\n  Directory "${targetDir}" already exists.\n`));
                process.exit(1);
            }

            const spinner = ora("Adding widget to workspace...").start();

            try {
                await scaffold(targetDir, options);

                // Update workspace config
                config.widgets[widgetName] = {
                    added: new Date().toISOString()
                };
                writeWorkspaceConfig(workspaceRoot, config);

                spinner.succeed("Widget added");

                console.log(chalk.green("\n  Done! Widget added to workspace.\n"));
                console.log(`  ${chalk.bold("cd widgets/" + widgetName)}  ${chalk.dim("# Navigate to widget")}`);
                console.log(`  ${chalk.bold("npm run build")}             ${chalk.dim("# Build this widget")}`);
                console.log();
                console.log(chalk.dim("  Run npm install in workspace root if needed."));
                console.log();
            } catch (err) {
                spinner.fail("Failed to add widget");
                console.error(chalk.red(err instanceof Error ? err.message : String(err)));
                process.exit(1);
            }
        });

    // Dev command - run dev mode for widget(s)
    program
        .command("dev")
        .description("Run development mode for widget(s)")
        .argument("[widgets...]", "Widget name(s) in PascalCase")
        .option("--all", "Run dev for all widgets")
        .action(async (widgets: string[], opts) => {
            const workspaceRoot = findWorkspaceRoot();
            if (!workspaceRoot) {
                console.error(chalk.red("\n  Not in a workspace. Run this command from workspace root.\n"));
                process.exit(1);
            }

            const config = readWorkspaceConfig(workspaceRoot);
            const widgetNames = getWidgetNames(widgets, opts.all);

            if (widgetNames.length === 0) {
                console.error(chalk.red("\n  No widgets specified. Use 'mx-widget-cli dev <widget>' or '--all'.\n"));
                process.exit(1);
            }

            if (widgetNames.length > 1) {
                console.error(chalk.red("\n  Dev mode only supports one widget at a time (watch mode).\n"));
                process.exit(1);
            }

            const widgetName = widgetNames[0];
            console.log(chalk.bold(`\n  Running dev mode for ${widgetName}...\n`));

            try {
                execSync(`npm run dev --workspace=widgets/${widgetName}`, {
                    cwd: workspaceRoot,
                    stdio: "inherit"
                });
            } catch (err) {
                console.error(chalk.red("\n  Dev command failed.\n"));
                process.exit(1);
            }
        });

    // Build command - build widget(s)
    program
        .command("build")
        .description("Build widget(s)")
        .argument("[widgets...]", "Widget name(s) in PascalCase")
        .option("--all", "Build all widgets")
        .option("--production", "Production build (release)")
        .action(async (widgets, opts) => {
            await runOrchestratedCommand(
                "Building",
                widgets,
                opts,
                opts.production ? "release" : "build",
                (w) => `Built ${w}`,
                (w) => `Failed to build ${w}`
            );
        });

    // Test command - run tests for widget(s)
    program
        .command("test")
        .description("Run tests for widget(s)")
        .argument("[widgets...]", "Widget name(s) in PascalCase")
        .option("--all", "Test all widgets")
        .action(async (widgets, opts) => {
            await runOrchestratedCommand(
                "Testing",
                widgets,
                opts,
                "test",
                (w) => `Tested ${w}`,
                (w) => `Tests failed for ${w}`
            );
        });

    // Lint command - lint widget(s)
    program
        .command("lint")
        .description("Lint widget(s)")
        .argument("[widgets...]", "Widget name(s) in PascalCase")
        .option("--all", "Lint all widgets")
        .option("--fix", "Auto-fix lint errors")
        .action(async (widgets, opts) => {
            await runOrchestratedCommand(
                "Linting",
                widgets,
                opts,
                opts.fix ? "lint:fix" : "lint",
                (w) => `Linted ${w}`,
                (w) => `Lint failed for ${w}`
            );
        });

    // Typegen command - generate types for widget(s)
    program
        .command("typegen")
        .description("Generate TypeScript types for widget(s)")
        .argument("[widgets...]", "Widget name(s) in PascalCase")
        .option("--all", "Generate types for all widgets")
        .action(async (widgets, opts) => {
            await runOrchestratedCommand(
                "Generating types for",
                widgets,
                opts,
                "typegen",
                (w) => `Generated types for ${w}`,
                (w) => `Type generation failed for ${w}`
            );
        });

    // List command - list all widgets in workspace
    program
        .command("list")
        .description("List all widgets in the workspace")
        .action(async () => {
            const workspaceRoot = findWorkspaceRoot();
            if (!workspaceRoot) {
                console.error(chalk.red("\n  Not in a workspace. Run this command from workspace root.\n"));
                process.exit(1);
            }

            const config = readWorkspaceConfig(workspaceRoot);
            const widgetNames = Object.keys(config.widgets);

            if (widgetNames.length === 0) {
                console.log(chalk.yellow("\n  No widgets in workspace. Use 'mx-widget-cli add' to add one.\n"));
                return;
            }

            console.log(chalk.bold("\n  Workspace Widgets\n"));

            for (const widgetName of widgetNames) {
                const widgetDir = join(workspaceRoot, "widgets", widgetName);
                const packageJsonPath = join(widgetDir, "package.json");

                if (existsSync(packageJsonPath)) {
                    try {
                        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
                        const version = packageJson.version || "?";
                        const description = packageJson.description || "No description";
                        console.log(`  ${chalk.bold(widgetName)} ${chalk.dim(`v${version}`)}`);
                        console.log(`  ${chalk.dim(description)}`);
                        console.log();
                    } catch {
                        console.log(`  ${chalk.bold(widgetName)} ${chalk.red("(invalid package.json)")}`);
                        console.log();
                    }
                } else {
                    console.log(`  ${chalk.bold(widgetName)} ${chalk.red("(missing package.json)")}`);
                    console.log();
                }
            }
        });

    await program.parseAsync(process.argv);
}

function getWidgetNames(widgets: string[], all: boolean): string[] {
    const workspaceRoot = findWorkspaceRoot();
    if (!workspaceRoot) {
        return [];
    }

    const availableWidgets = discoverWidgets(workspaceRoot);

    if (all) {
        return availableWidgets;
    }

    if (widgets.length === 0) {
        return [];
    }

    // Validate widget names exist in workspace
    const invalidWidgets = widgets.filter(w => !availableWidgets.includes(w));

    if (invalidWidgets.length > 0) {
        console.error(chalk.red(`\n  Unknown widget(s): ${invalidWidgets.join(", ")}\n`));
        console.log(chalk.dim("  Available widgets:"));
        availableWidgets.forEach(w => console.log(chalk.dim(`    - ${w}`)));
        console.log();
        process.exit(1);
    }

    return widgets;
}

main().catch(err => {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
});
