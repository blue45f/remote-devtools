export declare const enum FormatterActions {
    FORMAT = "format",
    PARSE_CSS = "parseCSS",
    JAVASCRIPT_SUBSTITUTE = "javaScriptSubstitute",
    JAVASCRIPT_SCOPE_TREE = "javaScriptScopeTree",
    EVALUATE_JAVASCRIPT_SUBSTRING = "evaluatableJavaScriptSubstring"
}
export declare const enum FormattableMediaTypes {
    APPLICATION_JAVASCRIPT = "application/javascript",
    APPLICATION_JSON = "application/json",
    APPLICATION_MANIFEST_JSON = "application/manifest+json",
    TEXT_CSS = "text/css",
    TEXT_HTML = "text/html",
    TEXT_JAVASCRIPT = "text/javascript",
    TEXT_X_SCSS = "text/x-scss",
    // JSON 관련 추가 MIME 타입들
    APPLICATION_VND_API_JSON = "application/vnd.api+json",
    APPLICATION_LD_JSON = "application/ld+json",
    APPLICATION_HAL_JSON = "application/hal+json",
    APPLICATION_SCHEMA_JSON = "application/schema+json",
    APPLICATION_FEED_JSON = "application/feed+json",
    APPLICATION_X_JSON = "application/x-json",
    TEXT_JSON = "text/json",
    TEXT_X_JSON = "text/x-json",
    // XML 관련 MIME 타입들
    APPLICATION_XML = "application/xml",
    TEXT_XML = "text/xml",
    APPLICATION_XHTML_XML = "application/xhtml+xml"
}
export declare const FORMATTABLE_MEDIA_TYPES: string[];
export declare function isFormattableMediaType(mimeType: string): boolean;
export interface FormatMapping {
    original: number[];
    formatted: number[];
}
export interface FormatResult {
    content: string;
    mapping: FormatMapping;
}
export declare const enum DefinitionKind {
    None = 0,
    Let = 1,
    Var = 2,
    Fixed = 3
}
export interface ScopeTreeNode {
    variables: {
        name: string;
        kind: DefinitionKind;
        offsets: number[];
    }[];
    start: number;
    end: number;
    children: ScopeTreeNode[];
}
