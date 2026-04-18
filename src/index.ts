import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { Command } from "commander";
import { input, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { scaffold, type ScaffoldOptions } from "./scaffold.js";

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

async function main(): Promise<void> {
    const program = new Command();

    program
        .name("mx-widget-cli")
        .description("Scaffold a modern Mendix pluggable widget project")
        .version("1.0.0")
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
                await scaffold(targetDir, options);
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

    await program.parseAsync(process.argv);
}

main().catch(err => {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
});
