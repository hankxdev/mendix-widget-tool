import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { generateForWidget } from "./generate.js";
import { parsePackageXml, parseWidgetXml } from "./parse-xml.js";

export { generateForWidget } from "./generate.js";
export { parsePackageXml, parseWidgetXml } from "./parse-xml.js";
export type * from "./types.js";

export async function generateFromPackageXml(srcDir: string, typingsDir: string): Promise<void> {
    const packageXmlPath = join(srcDir, "package.xml");
    if (!existsSync(packageXmlPath)) {
        throw new Error(`Cannot find package.xml at ${packageXmlPath}`);
    }

    const packageXmlContent = readFileSync(packageXmlPath, "utf-8");
    const packageXml = await parsePackageXml(packageXmlContent);

    const widgetFiles = packageXml.package.clientModule[0].widgetFiles[0].widgetFile;

    if (!existsSync(typingsDir)) {
        mkdirSync(typingsDir, { recursive: true });
    }

    for (const widgetFile of widgetFiles) {
        const widgetXmlPath = join(srcDir, widgetFile.$.path);
        if (!existsSync(widgetXmlPath)) {
            throw new Error(`Cannot find widget XML at ${widgetXmlPath}`);
        }

        const widgetXmlContent = readFileSync(widgetXmlPath, "utf-8");
        const widgetXml = await parseWidgetXml(widgetXmlContent);

        const widgetName = widgetFile.$.path.replace(/\.xml$/, "");
        const output = generateForWidget(widgetXml, widgetName);

        const outputPath = join(typingsDir, `${widgetName}Props.d.ts`);
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, output, "utf-8");
    }
}
