import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { input } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";

// Import version from package.json
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
const VERSION = packageJson.version;

export type ScaffoldMode = "workspace" | "single";

export interface WorkspaceConfig {
    version: 1;
    mendixProjectPath: string;
    defaultPackagePath: string;
    widgets: Record<string, { added: string }>;
}

/**
 * Detects if the current directory is part of a workspace
 */
export function detectWorkspaceMode(cwd: string = process.cwd()): ScaffoldMode {
    // Check for mx-workspace.json
    const workspaceConfigPath = join(cwd, "mx-workspace.json");
    if (existsSync(workspaceConfigPath)) {
        return "workspace";
    }

    // Check for package.json with workspaces field
    const packageJsonPath = join(cwd, "package.json");
    if (existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            if (packageJson.workspaces) {
                const workspaces = Array.isArray(packageJson.workspaces)
                    ? packageJson.workspaces
                    : packageJson.workspaces.packages || [];

                if (workspaces.includes("widgets/*")) {
                    return "workspace";
                }
            }
        } catch {
            // Invalid package.json, treat as single mode
        }
    }

    return "single";
}

/**
 * Finds workspace root by traversing up the directory tree
 */
export function findWorkspaceRoot(startDir: string = process.cwd()): string | null {
    let currentDir = resolve(startDir);
    const root = resolve("/");

    while (currentDir !== root) {
        if (detectWorkspaceMode(currentDir) === "workspace") {
            return currentDir;
        }
        currentDir = resolve(currentDir, "..");
    }

    return null;
}

/**
 * Reads workspace configuration
 */
export function readWorkspaceConfig(workspaceRoot: string): WorkspaceConfig {
    const configPath = join(workspaceRoot, "mx-workspace.json");
    if (!existsSync(configPath)) {
        throw new Error("mx-workspace.json not found");
    }
    return JSON.parse(readFileSync(configPath, "utf-8"));
}

/**
 * Writes workspace configuration
 */
export function writeWorkspaceConfig(workspaceRoot: string, config: WorkspaceConfig): void {
    const configPath = join(workspaceRoot, "mx-workspace.json");
    writeFileSync(configPath, JSON.stringify(config, null, 4) + "\n", "utf-8");
}

/**
 * Discovers all widgets in the workspace by scanning the widgets directory
 */
export function discoverWidgets(workspaceRoot: string): string[] {
    const widgetsDir = join(workspaceRoot, "widgets");
    if (!existsSync(widgetsDir)) {
        return [];
    }

    return readdirSync(widgetsDir).filter(entry => {
        const widgetDir = join(widgetsDir, entry);
        return existsSync(join(widgetDir, "package.json"));
    });
}

/**
 * Initializes a new workspace
 */
export async function initWorkspace(
    targetDir: string,
    options?: { mendixProjectPath?: string; defaultPackagePath?: string }
): Promise<void> {
    if (existsSync(targetDir)) {
        const isEmpty = readdirSync(targetDir).length === 0;
        if (!isEmpty) {
            throw new Error("Directory is not empty. Please run init in an empty directory.");
        }
    } else {
        mkdirSync(targetDir, { recursive: true });
    }

    console.log(chalk.bold("\n  Initialize Mendix Widget Workspace\n"));

    // Prompt for workspace configuration if not provided
    const mendixProjectPath =
        options?.mendixProjectPath ??
        (await input({
            message: "Mendix project path (relative):",
            default: "../../"
        }));

    const defaultPackagePath =
        options?.defaultPackagePath ??
        (await input({
            message: "Default package namespace:",
            default: "mendix"
        }));

    const spinner = ora("Creating workspace structure...").start();

    try {
        // Create directory structure
        const packagesDir = join(targetDir, "packages");
        const widgetsDir = join(targetDir, "widgets");
        const sharedTypingsDir = join(packagesDir, "shared-typings");

        mkdirSync(packagesDir, { recursive: true });
        mkdirSync(widgetsDir, { recursive: true });
        mkdirSync(sharedTypingsDir, { recursive: true });

        // Create root package.json
        const rootPackageJson = {
            name: "mendix-widgets",
            private: true,
            workspaces: [
                "widgets/*",
                "packages/*"
            ],
            scripts: {
                dev: "mx-widget-cli dev",
                build: "mx-widget-cli build --all",
                test: "mx-widget-cli test --all"
            },
            devDependencies: {
                "mx-widget-cli": `^${VERSION}`
            }
        };

        writeFileSync(
            join(targetDir, "package.json"),
            JSON.stringify(rootPackageJson, null, 4) + "\n",
            "utf-8"
        );

        // Create mx-workspace.json
        const workspaceConfig: WorkspaceConfig = {
            version: 1,
            mendixProjectPath,
            defaultPackagePath,
            widgets: {}
        };

        writeWorkspaceConfig(targetDir, workspaceConfig);

        // Create shared-typings package.json
        const typingsPackageJson = {
            name: "@mx/typings",
            version: "0.0.0",
            description: "Shared TypeScript type definitions for Mendix widgets",
            main: "index.d.ts",
            types: "index.d.ts"
        };

        writeFileSync(
            join(sharedTypingsDir, "package.json"),
            JSON.stringify(typingsPackageJson, null, 4) + "\n",
            "utf-8"
        );

        // Create mendix.d.ts in shared-typings
        const mendixDts = `// Type definitions for Mendix Client API
// Documentation: https://apidocs.rnd.mendix.com/10/client/

declare const mx: {
    data: typeof mxData;
    ui: typeof mxUI;
};

// mx.data namespace - Data operations
declare namespace mxData {
    // Core types
    type GUID = string;
    type Callback<T> = (result: T) => void;
    type ErrorCallback = (error: Error) => void;

    // Essential methods
    function get(args: GetArgs): void;
    function create(args: CreateArgs): void;
    function commit(args: CommitArgs): void;
    function rollback(args: RollbackArgs): void;
    function remove(args: RemoveArgs): void;
    function subscribe(args: SubscribeArgs): number;
    function unsubscribe(handle: number): void;

    // Parameter interfaces
    interface GetArgs {
        guid?: GUID;
        guids?: GUID[];
        xpath?: string;
        microflow?: string;
        callback: Callback<MxObject | MxObject[]>;
        error?: ErrorCallback;
        filter?: FilterOptions;
    }

    interface CreateArgs {
        entity: string;
        callback: Callback<MxObject>;
        error?: ErrorCallback;
    }

    interface CommitArgs {
        mxobj: MxObject;
        callback?: Callback<boolean>;
        error?: ErrorCallback;
    }

    interface RollbackArgs {
        mxobj: MxObject;
        callback?: Callback<boolean>;
        error?: ErrorCallback;
    }

    interface RemoveArgs {
        guid?: GUID;
        guids?: GUID[];
        callback?: Callback<boolean>;
        error?: ErrorCallback;
    }

    interface SubscribeArgs {
        guid?: GUID;
        entity?: string;
        attr?: string;
        callback: Callback<MxObject>;
        error?: ErrorCallback;
    }

    interface FilterOptions {
        offset?: number;
        amount?: number;
        sort?: Array<[string, "asc" | "desc"]>;
        distinct?: boolean;
        references?: { [key: string]: string };
    }

    // MxObject interface
    interface MxObject {
        getGuid(): GUID;
        getEntity(): string;
        get(attr: string): any;
        set(attr: string, value: any): boolean;
        fetch(attr: string, callback: Callback<any>): void;
        getAttributes(): string[];
        getReferences(refName: string): GUID[];
        addReference(refName: string, guid: GUID): void;
        removeReferences(refName: string, guids: GUID[]): void;
        isA(entity: string): boolean;
    }
}

// mx.ui namespace - UI operations
declare namespace mxUI {
    function openForm(path: string, args?: OpenFormArgs, callback?: () => void, error?: ErrorCallback): void;
    function back(): void;
    function reload(): void;
    function showProgress(message?: string, modal?: boolean): number;
    function hideProgress(handle: number): void;
    function info(message: string, modal?: boolean): void;
    function error(message: string, modal?: boolean): void;
    function warning(message: string, modal?: boolean): void;
    function confirmation(args: ConfirmationArgs): void;

    interface OpenFormArgs {
        location?: "content" | "popup" | "modal";
        context?: any;
        callback?: () => void;
        error?: ErrorCallback;
    }

    interface ConfirmationArgs {
        content: string;
        proceed: string;
        cancel: string;
        handler: (confirmed: boolean) => void;
    }

    type ErrorCallback = (error: Error) => void;
}
`;

        writeFileSync(
            join(sharedTypingsDir, "mendix.d.ts"),
            mendixDts,
            "utf-8"
        );

        // Create css.d.ts in shared-typings
        const cssDts = `declare module "*.css" {
    const content: string;
    export default content;
}

declare module "*.scss" {
    const content: string;
    export default content;
}

declare module "*.sass" {
    const content: string;
    export default content;
}
`;

        writeFileSync(
            join(sharedTypingsDir, "css.d.ts"),
            cssDts,
            "utf-8"
        );

        // Create index.d.ts in shared-typings
        const indexDts = `/// <reference path="./mendix.d.ts" />
/// <reference path="./css.d.ts" />

export {};
`;

        writeFileSync(
            join(sharedTypingsDir, "index.d.ts"),
            indexDts,
            "utf-8"
        );

        // Create .gitignore if it doesn't exist
        const gitignore = `node_modules/
dist/
*.mpk
.DS_Store
`;

        writeFileSync(
            join(targetDir, ".gitignore"),
            gitignore,
            "utf-8"
        );

        spinner.succeed("Workspace initialized");

        console.log(chalk.green("\n  Done! Workspace is ready.\n"));
        console.log(`  ${chalk.bold("npm install")}          ${chalk.dim("# Install shared dependencies")}`);
        console.log(`  ${chalk.bold("mx-widget-cli add")}    ${chalk.dim("# Add your first widget")}`);
        console.log();
    } catch (error) {
        spinner.fail("Workspace initialization failed");
        throw error;
    }
}
