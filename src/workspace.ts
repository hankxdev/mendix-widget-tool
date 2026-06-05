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
                build: "mx-widget-cli build",
                release: "mx-widget-cli build --production",
                test: "mx-widget-cli test"
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

declare global {
    const mx: {
        data: typeof mxData;
        ui: typeof mxUI;
        session?: {
            sessionData: mxSession.SessionData;
            getUserRoleName?(): string | string[];
            getUserRoleNames(): string[];
            getUserId?(): string;
            getUserName?(): string;
            getUserObject?(): mxSession.UserObject | undefined;
        };
        logout?(): void;
        reloadWithState?(): void;
    };

    // mx.session namespace - Session information
    namespace mxSession {
        interface AttributeValue {
            value: string;
        }

        interface UserAttributes {
            Email: AttributeValue;
            FullName: AttributeValue;
            Base64Thumbnail: AttributeValue;
        }

        interface User {
            attributes: UserAttributes;
            guid: string;
        }

        interface UserObject {
            getGuid(): string;
            jsonData: {
                attributes: {
                    [attribute: string]: { value: string } | undefined;
                };
            };
            addReference(refName: string, guid: string): void;
        }

        interface SessionData {
            user: User;
            local: {
                code: string;
            };
            csrftoken: string;
            [key: string]: any;
        }
    }

    // mx.data namespace - Data operations
    namespace mxData {
    // Core types
    type GUID = string;
    type Callback<T> = (result: T) => void;
    type ErrorCallback = (error: Error) => void;
    type SubscribeHandle = number;
    type SortSpec = Array<[string, "asc" | "desc"]>;
    type ActionResultValue = MxObject | MxObject[] | boolean | number | string;

    // Methods
    function action(args: ActionArgs): void;
    function callNanoflow(params: CallNanoflowArgs): void;
    function get(args: GetArgs): void;
    function getOffline(
        entity: string,
        constraints: OfflineConstraint[],
        filter: OfflineFilter,
        callback: (objs: MxObject[], count: number) => void,
        error?: ErrorCallback
    ): void;
    function create(args: CreateArgs): void;
    function commit(args: CommitArgs): void;
    function rollback(args: RollbackArgs): void;
    function remove(args: RemoveArgs): void;
    function saveDocument(
        guid: GUID,
        fileName: string | null,
        params: SaveDocumentParams,
        blob: Blob,
        callback: () => void,
        error?: ErrorCallback
    ): void;
    function subscribe(args: SubscribeArgs): SubscribeHandle;
    function unsubscribe(handle: SubscribeHandle): void;
    function update(args: UpdateArgs): void;

    // --- action ---

    interface ActionArgs {
        params: ActionParams;
        /** The page on which instructions returned by the server ('close form' in particular) can be executed. */
        origin?: any;
        /** Whether the Microflow should be executed asynchronously. The result of an async microflow is not returned. */
        async?: boolean;
        callback?: (value: ActionResultValue) => void;
        error?: ErrorCallback;
        onValidation?: (validations: ObjectValidation[]) => void;
    }

    interface ActionParams {
        /** Name of the Microflow to invoke. */
        actionname: string;
        /** To what to apply the Microflow. */
        applyto?: "none" | "set" | "selection";
        /** The GUIDs to apply the Microflow to (when applyto is "selection"). */
        guids?: GUID[];
        /** The root entity for an XPath query (when applyto is "set"). */
        xpath?: string;
        /** The constraints for the xpath parameter. */
        constraints?: string;
        /** Sorting of XPath query results before feeding them to the Microflow. */
        sort?: SortSpec;
    }

    // --- callNanoflow ---

    interface CallNanoflowArgs {
        /** Nanoflow definition to execute (from widget property). Do not tamper with this value. */
        nanoflow: object;
        /** The context for the Nanoflow. */
        context?: any;
        /** The page on which instructions ('close form' in particular) can be executed. */
        origin?: any;
        callback?: (value: ActionResultValue) => void;
        error?: ErrorCallback;
    }

    // --- get ---

    interface GetArgs {
        guid?: GUID;
        guids?: GUID[];
        /** XPath query to retrieve (not supported offline). */
        xpath?: string;
        /** A Microflow to fetch objects from (not supported offline). */
        microflow?: string;
        /** Path (reference name) to the desired object, relative to the object referenced by guid. */
        path?: string;
        callback: (objs: any) => void;
        error?: ErrorCallback;
        /** Whether a count of the entire set should be returned. */
        count?: boolean;
        filter?: FilterOptions;
    }

    interface FilterOptions {
        /** If provided, only the given attributes will be fetched. */
        attributes?: string[];
        offset?: number;
        amount?: number;
        sort?: SortSpec;
        distinct?: boolean;
        /** Pre-fetch associated references within the same request (XPath only). */
        references?: { [refName: string]: ReferencesSpec };
    }

    interface ReferencesSpec {
        /** If provided, only the given attributes of referenced objects will be fetched. */
        attributes?: string[];
        /** Maximum number of referenced objects to fetch. */
        amount?: number;
        sort?: SortSpec;
    }

    // --- getOffline ---

    interface OfflineConstraint {
        /** One of: equals, lessThan, lessThanOrEquals, greaterThan, greaterThanOrEquals, contains, and, or. */
        operator: "equals" | "lessThan" | "lessThanOrEquals" | "greaterThan" | "greaterThanOrEquals" | "contains" | "and" | "or";
        /** The attribute (or reference) to constrain on. Omit for "and" / "or" operators. */
        attribute?: string;
        /** An argument for the constraint's operator. Omit for "and" / "or" operators. */
        value?: string | number;
        /** If true, return objects NOT matching the constraint. */
        negate?: boolean;
        /** Nested constraints to combine with the given operator ("and" / "or" only). */
        constraints?: OfflineConstraint[];
    }

    interface OfflineFilter {
        offset?: number;
        limit?: number;
        sort?: SortSpec;
    }

    // --- create ---

    interface CreateArgs {
        entity: string;
        callback: (obj: MxObject) => void;
        error?: ErrorCallback;
    }

    // --- commit ---

    interface CommitArgs {
        mxobj?: MxObject;
        mxobjs?: MxObject[];
        callback?: () => void;
        error?: ErrorCallback;
        onValidation?: (validations: ObjectValidation[]) => void;
    }

    // --- rollback ---

    interface RollbackArgs {
        mxobj?: MxObject;
        mxobjs?: MxObject[];
        callback?: () => void;
        error?: ErrorCallback;
    }

    // --- remove ---

    interface RemoveArgs {
        guid?: GUID;
        guids?: GUID[];
        callback?: () => void;
        error?: ErrorCallback;
    }

    // --- saveDocument ---

    interface SaveDocumentParams {
        /** Width of the generated thumbnail (for images). */
        width?: number;
        /** Height of the generated thumbnail (for images). */
        height?: number;
        [key: string]: any;
    }

    // --- subscribe ---

    interface SubscribeArgs {
        /** GUID to subscribe to (object-level or attribute-level changes). */
        guid?: GUID;
        /** Entity to subscribe to (entity-level changes). */
        entity?: string;
        /** Attribute to subscribe to (attribute-level changes, requires guid). */
        attr?: string;
        /** Subscribe to validation feedback on an MxObject. */
        val?: boolean;
        callback: SubscribeObjectCallback | SubscribeAttributeCallback | SubscribeEntityCallback | SubscribeValidationCallback;
    }

    type SubscribeObjectCallback = (guid: GUID) => void;
    type SubscribeAttributeCallback = (guid: GUID, attr: string, value: any) => void;
    type SubscribeEntityCallback = (entity: string) => void;
    type SubscribeValidationCallback = (validations: ObjectValidation[]) => void;

    // --- update ---

    interface UpdateArgs {
        /** GUID to invoke the update for. */
        guid?: GUID;
        /** Entity to invoke the update for. */
        entity?: string;
        /** Attribute to invoke the update for. */
        attr?: string;
        callback?: () => void;
    }

    // --- ObjectValidation ---

    interface ObjectValidation {
        getGuid(): GUID;
        getReasonByAttribute(attr: string): string;
        removeAttribute(attr: string): void;
    }

    // --- MxObject ---

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
    namespace mxUI {
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
}

export {};
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
