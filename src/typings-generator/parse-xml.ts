import { parseStringPromise } from "xml2js";
import type { PackageXml, WidgetXml } from "./types.js";

export async function parsePackageXml(content: string): Promise<PackageXml> {
    return parseStringPromise(content) as Promise<PackageXml>;
}

export async function parseWidgetXml(content: string): Promise<WidgetXml> {
    return parseStringPromise(content) as Promise<WidgetXml>;
}
