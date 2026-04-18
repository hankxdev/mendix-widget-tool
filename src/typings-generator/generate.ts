import { extractProperties, extractSystemProperties } from "./helpers.js";
import { generateClientTypes } from "./generate-client-types.js";
import { generatePreviewTypes } from "./generate-preview-types.js";
import type { WidgetXml } from "./types.js";

const mxExports = [
    "ActionValue",
    "AssociationMetaData",
    "AttributeMetaData",
    "DynamicValue",
    "EditableValue",
    "EditableListValue",
    "EditableFileValue",
    "EditableImageValue",
    "FileValue",
    "ListValue",
    "Option",
    "ListActionValue",
    "ListAttributeValue",
    "ListAttributeListValue",
    "ListExpressionValue",
    "ListReferenceValue",
    "ListReferenceSetValue",
    "ListWidgetValue",
    "ReferenceValue",
    "ReferenceSetValue",
    "SelectionSingleValue",
    "SelectionMultiValue",
    "WebIcon",
    "WebImage"
];

export function generateForWidget(widgetXml: WidgetXml, widgetName: string): string {
    if (!widgetXml?.widget?.properties) {
        throw new Error("[XML] XML doesn't contain <properties> element");
    }

    if (widgetXml.widget.$.pluginWidget !== "true") {
        throw new Error("[XML] Attribute pluginWidget=true not found. Please review your XML");
    }

    const propElements = widgetXml.widget.properties[0] ?? [];
    const properties = extractProperties(propElements).filter(prop => prop?.$?.key);
    const systemProperties = extractSystemProperties(propElements).filter(prop => prop?.$?.key);

    const clientTypes = generateClientTypes(widgetName, properties, systemProperties);
    const previewTypes = generatePreviewTypes(widgetName, properties, systemProperties);

    const generatedTypesCode = clientTypes
        .slice(0, clientTypes.length - 1)
        .concat(previewTypes.slice(0, previewTypes.length - 1))
        .concat([clientTypes[clientTypes.length - 1], previewTypes[previewTypes.length - 1]])
        .join("\n\n");

    const imports = [
        generateImport("react", generatedTypesCode, ["ComponentType", "CSSProperties", "ReactNode"]),
        generateImport("mendix", generatedTypesCode, mxExports),
        generateImport("big.js", generatedTypesCode, ["Big"])
    ]
        .filter(line => line)
        .join("\n");

    return `/**
 * This file was generated from ${widgetName}.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
${imports.length ? imports + "\n\n" : ""}${generatedTypesCode}
`;
}

function generateImport(from: string, code: string, availableNames: string[]): string {
    const usedNames = availableNames.filter(type => new RegExp(`\\W${type}\\W`).test(code));
    return usedNames.length ? `import { ${usedNames.join(", ")} } from "${from}";` : "";
}
