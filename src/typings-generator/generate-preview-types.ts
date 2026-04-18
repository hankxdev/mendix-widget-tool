import { capitalizeFirstLetter, extractProperties } from "./helpers.js";
import { hasOptionalDataSource, toUniqueUnionType } from "./generate-client-types.js";
import type { Property, SystemProperty } from "./types.js";

export function generatePreviewTypes(
    widgetName: string,
    properties: Property[],
    systemProperties: SystemProperty[]
): string[] {
    const results: string[] = [];
    const isLabeled = systemProperties.some(p => p.$.key === "Label");

    function resolveProp(key: string): Property | undefined {
        return properties.find(p => p.$.key === key);
    }

    results.push(
        `export interface ${widgetName}PreviewProps {` +
        (!isLabeled
            ? `\n    /**\n     * @deprecated Deprecated since version 9.18.0. Please use class property instead.\n     */\n    className: string;\n    class: string;\n    style: string;\n    styleObject?: CSSProperties;`
            : "") +
        `\n    readOnly: boolean;` +
        `\n    renderMode: "design" | "xray" | "structure";` +
        `\n    translate: (text: string) => string;\n` +
        generatePreviewTypeBody(properties, results, resolveProp) +
        "\n}"
    );

    return results;
}

function generatePreviewTypeBody(
    properties: Property[],
    generatedTypes: string[],
    resolveProp: (key: string) => Property | undefined
): string {
    return properties
        .filter(prop => {
            if (prop.$.type === "datasource" && prop.$.isLinked) return false;
            return true;
        })
        .map(prop => `    ${prop.$.key}: ${toPreviewPropType(prop, generatedTypes, resolveProp)};`)
        .join("\n");
}

function toPreviewPropType(
    prop: Property,
    generatedTypes: string[],
    resolveProp: (key: string) => Property | undefined
): string {
    switch (prop.$.type) {
        case "boolean":
            return "boolean";
        case "string":
            return "string";
        case "action":
            return "{} | null";
        case "textTemplate":
            return "string";
        case "integer":
        case "decimal":
            return "number | null";
        case "icon":
            return '{ type: "glyph"; iconClass: string; } | { type: "image"; imageUrl: string; iconUrl: string; } | { type: "icon"; iconClass: string; } | undefined';
        case "image":
            return '{ type: "static"; imageUrl: string; } | { type: "dynamic"; entity: string; } | null';
        case "file":
            return "string";
        case "datasource":
            return "{} | { caption: string } | { type: string } | null";
        case "attribute":
        case "association":
        case "expression":
            return "string";
        case "enumeration":
            return capitalizeFirstLetter(prop.$.key) + "Enum";
        case "object": {
            if (!prop.properties?.length) {
                throw new Error("[XML] Object property requires properties element");
            }
            const childType = capitalizeFirstLetter(prop.$.key) + "PreviewType";
            const childProperties = extractProperties(prop.properties[0]);
            const resolveChildProp = (key: string) =>
                key.startsWith("../")
                    ? resolveProp(key.substring(3))
                    : childProperties.find(p => p.$.key === key);
            generatedTypes.push(
                `export interface ${childType} {\n` +
                generatePreviewTypeBody(childProperties, generatedTypes, resolveChildProp) +
                "\n}"
            );
            return prop.$.isList === "true" ? `${childType}[]` : childType;
        }
        case "widgets":
            return '{ widgetCount: number; renderer: ComponentType<{ children: ReactNode; caption?: string }> }';
        case "selection": {
            if (!prop.selectionTypes?.length) {
                throw new Error("[XML] Selection property requires selectionTypes element");
            }
            const selectionTypes = prop.selectionTypes
                .flatMap(s => s.selectionType)
                .map(s => s.$.name);
            if (hasOptionalDataSource(prop, resolveProp)) {
                selectionTypes.push("None");
            }
            return toUniqueUnionType(selectionTypes.map(s => `"${s}"`));
        }
        default:
            return "any";
    }
}
