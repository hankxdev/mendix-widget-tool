import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import { generateFromPackageXml } from "./typings-generator/index.js";
import type { ScaffoldMode } from "./workspace.js";

export interface ScaffoldOptions {
    widgetName: string;
    description: string;
    author: string;
    packagePath: string;
    needsEntityContext: boolean;
    projectPath: string;
}

export interface WorkspaceScaffoldOptions extends ScaffoldOptions {
    mode: ScaffoldMode;
    workspaceRoot?: string;
}

interface TemplateVars {
    widgetName: string;
    widgetNameLower: string;
    widgetNameKebab: string;
    packagePath: string;
    packagePathDir: string;
    widgetId: string;
    description: string;
    author: string;
    needsEntityContext: string;
    projectPath: string;
    mode: ScaffoldMode;
    packageName: string;
}

function toKebabCase(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();
}

function computeVars(options: WorkspaceScaffoldOptions): TemplateVars {
    const widgetNameLower = options.widgetName.toLowerCase();
    const widgetNameKebab = toKebabCase(options.widgetName);
    const mode = options.mode || "single";
    const packageName = mode === "workspace" ? `@widgets/${widgetNameKebab}` : widgetNameKebab;

    return {
        widgetName: options.widgetName,
        widgetNameLower,
        widgetNameKebab,
        packagePath: options.packagePath,
        packagePathDir: options.packagePath.replace(/\./g, "/"),
        widgetId: `${options.packagePath}.${widgetNameLower}.${options.widgetName}`,
        description: options.description,
        author: options.author,
        needsEntityContext: String(options.needsEntityContext),
        projectPath: options.projectPath,
        mode,
        packageName
    };
}

function walkDir(dir: string): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory()) {
            results.push(...walkDir(fullPath));
        } else {
            results.push(fullPath);
        }
    }
    return results;
}

export async function scaffold(targetDir: string, options: WorkspaceScaffoldOptions): Promise<void> {
    const vars = computeVars(options);
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const templatesDir = join(__dirname, "templates");
    const mode = options.mode || "single";

    const templateFiles = walkDir(templatesDir);

    // Files to skip in workspace mode
    const skipInWorkspace = [
        "typings/mendix.d.ts",
        "typings/css.d.ts"
    ];

    for (const templateFile of templateFiles) {
        const relPath = relative(templatesDir, templateFile);

        // Skip certain files in workspace mode
        if (mode === "workspace" && skipInWorkspace.some(skip => relPath.includes(skip))) {
            continue;
        }

        let outputRelPath = relPath.replace(/\.ejs$/, "");
        outputRelPath = outputRelPath.replace(/__WidgetName__/g, vars.widgetName);

        const outputPath = join(targetDir, outputRelPath);
        mkdirSync(dirname(outputPath), { recursive: true });

        const templateContent = readFileSync(templateFile, "utf-8");

        if (templateFile.endsWith(".ejs")) {
            const rendered = ejs.render(templateContent, vars);
            writeFileSync(outputPath, rendered, "utf-8");
        } else {
            writeFileSync(outputPath, templateContent, "utf-8");
        }
    }

    const srcDir = join(targetDir, "src");
    const typingsDir = join(targetDir, "typings");
    await generateFromPackageXml(srcDir, typingsDir);
}
