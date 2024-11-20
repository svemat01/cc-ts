import { extname } from "node:path";

// https://www.lua.org/pil/2.4.html
// https://www.ecma-international.org/ecma-262/10.0/index.html#table-34
const escapeStringRegExp = /[\b\f\n\r\t\v\\"\0]/g;
const escapeStringMap: Record<string, string> = {
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t",
    "\v": "\\v",
    "\\": "\\\\",
    '"': '\\"',
    "\0": "\\0",
};

export const escapeString = (value: string) => `"${value.replace(escapeStringRegExp, char => escapeStringMap[char])}"`;

export function formatPathToLuaPath(filePath: string): string {
    filePath = filePath.replace(/\.json$/, "");
    if (process.platform === "win32") {
        // Windows can use backslashes
        filePath = filePath.replace(/\.\\/g, "").replace(/\\/g, ".");
    }
    return filePath.replace(/\.\//g, "").replace(/\//g, ".");
}

export const trimExtension = (filePath: string) => filePath.slice(0, -extname(filePath).length);