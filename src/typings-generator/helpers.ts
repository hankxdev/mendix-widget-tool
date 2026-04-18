import type { Properties, Property, PropertyGroup, SystemProperty } from "./types.js";

export function extractProperties(props: Properties | PropertyGroup): Property[] {
    if ("propertyGroup" in props && props.propertyGroup) {
        return props.propertyGroup
            .map(pg => extractProperties(pg))
            .reduce((a, e) => a.concat(e), []);
    }
    return props.property ?? [];
}

export function extractSystemProperties(props: Properties): SystemProperty[] {
    if (props.propertyGroup) {
        return props.propertyGroup
            .map(pg => extractProps(pg, p => p.systemProperty ?? []))
            .reduce((a, e) => a.concat(e), []);
    }
    return props.systemProperty ?? [];
}

function extractProps<T>(
    props: Properties | PropertyGroup,
    extractor: (p: Properties | PropertyGroup) => T[]
): T[] {
    if ("propertyGroup" in props && props.propertyGroup) {
        return props.propertyGroup
            .map(pg => extractProps(pg, extractor))
            .reduce((a, e) => a.concat(e), []);
    }
    return extractor(props);
}

export function capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function commasAnd(arr: string[]): string {
    return arr.slice(0, -1).join(", ") + (arr.length > 1 ? " and " : "") + arr[arr.length - 1];
}
