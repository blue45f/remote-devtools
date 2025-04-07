/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { calculate, compare, SpecificityArray } from "specificity";

import { DEVTOOL_STYLESHEET } from "../common/constant";
import nodes from "../common/nodes";
import * as stylesheet from "../common/stylesheet";
import {
  escapeRegString,
  getAbsolutePath,
  isMatches,
  isElement,
  isHTMLElement,
} from "../common/utils";

import { BaseDomain } from "./base";
import { Page } from "./page";
import { Events } from "./protocol";

interface StyleRule {
  selectorText: string;
  cssText: string;
  media?: { source: string; text: string }[];
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

declare global {
  interface CSSStyleSheet {
    styleSheetId: string;
  }

  interface StyleSheet {
    devToolsOverrideStyle: HTMLStyleElement;
  }

  interface XMLHttpRequest {
    $$requestType: string;
  }
}

export class CSS extends BaseDomain {
  public namespace = "CSS";

  // css style collection
  private styles = new Map<string, string>();
  // style rule collection
  private styleRules = new Map<string, StyleRule[]>();

  // The unique id of the css style sheet
  private styleSheetId = 1;

  /**
   * Formatting css rules
   */
  public static formatCssRule(
    styleSheetId: string,
    rule: StyleRule,
    node: Node,
  ): any {
    let index = 0;
    let specificityArray: SpecificityArray = [0, 0, 0, 0];

    const selectors = rule.selectorText
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(",")
      .map((item, i) => {
        const text = item.trim();
        if (isElement(node) && isMatches(node, text)) {
          specificityArray = calculate(text)[0].specificityArray;
          index = i;
        } else if (
          ["::before", "::after"].includes(node.nodeName?.toLowerCase())
        ) {
          const [selectorText, pseudoType] = text.split(":").filter(Boolean);
          if (
            pseudoType &&
            node.nodeName.toLowerCase() === `::${pseudoType}` &&
            isElement(node.parentNode) &&
            isMatches(node.parentNode, selectorText)
          ) {
            specificityArray = calculate(text)[0].specificityArray;
            index = i;
          }
        }
        return { text };
      });

    const cssText = /\{([\s\S]*)\}/.exec(rule.cssText)?.[1];

    return {
      index,
      specificityArray,
      cssRule: {
        styleSheetId,
        media: rule.media || [],
        style: {
          styleSheetId,
          cssText,
          cssProperties: CSS.formatCssProperties(cssText, rule.range),
          shorthandEntries: [],
          range: rule.range,
        },
        selectorList: {
          selectors,
          text: rule.selectorText,
        },
      },
    };
  }

  /**
   * Get the scope of inline css
   * @static
   * @param {String} name css attribute name
   * @param {String} value css value
   * @param {String} cssText cssText
   */
  private static getInlineStyleRange(
    name: string,
    value: string,
    cssText: string,
  ) {
    const lines = cssText.split("\n");
    let startLine = 0;
    let endLine = 0;
    let startColumn = 0;
    let endColumn = 0;
    let text = "";

    const reg = new RegExp(
      `(\\/\\*)?\\s*${escapeRegString(name)}:\\s*${escapeRegString(value)};?\\s*(\\*\\/)?`,
    );
    for (let i = 0, len = lines.length; i < len; i++) {
      const line = lines[i];
      const match = line.match(reg);
      if (match) {
        text = match[0];
        startLine = i;
        startColumn = match.index || 0;
        endLine = i;
        endColumn = startColumn + text.length;
        break;
      }
    }

    return {
      range: {
        startLine,
        endLine,
        startColumn,
        endColumn,
      },
      text,
    };
  }

  /**
   * Formatting css properties
   * @static
   * @param {String} cssText  css text，eg：height:100px;width:100px;
   * @param {Object} cssRange css text range，eg: {startLine,startColumn,endLine,endColumn}
   */
  private static formatCssProperties(
    cssText = "",
    cssRange: {
      startLine?: number;
      startColumn?: number;
      endLine?: number;
      endColumn?: number;
    } = {},
  ): ({
    name: string;
    value: string;
    text: string;
    important: boolean;
    disabled: boolean;
    implicit: boolean;
    shorthandEntries: unknown[];
    range?: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
    parsedOk?: boolean;
  } | null)[] {
    const isValidProp = (text: string) => /[\s\S]+?:[\s\S]+?;/.test(text);
    const splitProps = (text: string) =>
      text.split(";").map((v, i, a) => (i < a.length - 1 ? `${v};` : v));
    const splited = cssText
      .split(/\/\*/)
      .map((text) => text.split(/\*\//))
      .map((item) => {
        if (item.length === 1) return item;
        if (item[0].split("\n").length > 1) return [item[1]];
        return item;
      })
      .reduce((pre, cur) => {
        if (cur.length === 1) {
          return pre.concat(splitProps(cur[0]));
        }
        const props = splitProps(cur[1]);
        if (!isValidProp(props[0])) {
          pre[pre.length - 1] += `/*${cur[0]}*/` + props.shift();
          return pre.concat(props);
        }
        return pre.concat(`/*${cur[0]}*/`, props);
      }, []);

    /**
     * NOTE: devtools에서 css수정시 에러가 있음.
     * @see https://github.com/Nice-PLQ/devtools-remote-debugger/issues/32#issuecomment-2338621885
     * */
    const formatVal = (text: string) => text.trim().replace(/\/\*.*?\*\//g, "");
    return splited
      .map((style) => {
        const [name, ...values] = style
          .replace(/^\/\*|;?\s*\*\/$|;$/g, "")
          .split(":");
        const value = values.join(":");
        if (value) {
          let range;
          if (cssRange) {
            const match = cssText.match(
              new RegExp(
                `(^|[{/;\\s\n])${style.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}`,
              ),
            );
            const index = (match?.index ?? 0) + (match?.[1]?.length ?? 0) || 0;
            const leftExcludes = cssText.substring(0, index).split("\n");
            const leftIncludes = (leftExcludes.join("\n") + style).split("\n");
            range = {
              startLine: (cssRange.startLine ?? 0) + leftExcludes.length - 1,
              startColumn:
                (leftExcludes.length === 1 ? (cssRange.startColumn ?? 0) : 0) +
                leftExcludes[leftExcludes.length - 1].length,
              endLine: (cssRange.startLine ?? 0) + leftIncludes.length - 1,
              endColumn:
                (leftIncludes.length === 1 ? (cssRange.startColumn ?? 0) : 0) +
                leftIncludes[leftIncludes.length - 1].length,
            };
          }
          return {
            name: formatVal(name),
            value: formatVal(value),
            text: style,
            important: value.includes("important"),
            disabled: style.includes("/*"),
            implicit: false,
            shorthandEntries: [],
            range,
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  public enable(): void {
    this.collectStyles();
    this.sendCacheStyles();
  }

  public getDynamicLink(url: string): void {
    const sourceURL = getAbsolutePath(url);
    const styleSheets = Array.from(document.styleSheets);
    const style = styleSheets.find((_style) => _style.href === sourceURL);
    if (!style) return;

    const styleSheetId = this.getStyleSheetId();
    stylesheet.setStyleSheet(styleSheetId, style);
    style.styleSheetId = styleSheetId;
    this.fetchStyleSource(styleSheetId, sourceURL);
  }

  private sendCacheStyles() {
    for (const styleSheetId of Array.from(this.styles.keys())) {
      const content = this.styles.get(styleSheetId);
      const style = stylesheet.getStyleSheetById(styleSheetId);
      const sourceURL = getAbsolutePath(style?.href || location.href);
      if (sourceURL && content) {
        this.sendProtocol({
          method: Events.styleSheetAdded,
          params: {
            header: {
              frameId: Page.MAINFRAME_ID,
              styleSheetId,
              sourceURL,
              origin: "regular",
              disabled: false,
              isConstructed: false,
              isInline: false,
              isMutable: true,
              length: content.length,
              startLine: 0,
              endLine: content.split("\n").length - 1,
              startColumn: 0,
              endColumn:
                content.split("\n").length - content.lastIndexOf("\n") - 1 - 1,
              title: style?.title,
            },
          },
        });
      }
    }
  }

  private collectStyles() {
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach((style) => {
      if (!style.styleSheetId) {
        const styleSheetId = this.getStyleSheetId();
        const sourceURL = getAbsolutePath(style.href);
        stylesheet.setStyleSheet(styleSheetId, style);
        style.styleSheetId = styleSheetId;
        if (sourceURL) {
          this.fetchStyleSource(styleSheetId, sourceURL);
        } else if (
          isHTMLElement(style.ownerNode) &&
          style.ownerNode.innerHTML
        ) {
          const content = style.ownerNode.innerHTML;
          this.styles.set(styleSheetId, content);
          this.styleRules.set(styleSheetId, this.parseStyleRules(content));
          const htmlContent = document.documentElement.outerHTML;
          const index = htmlContent.indexOf(content);
          const leftExcludes = htmlContent.substring(0, index).split("\n");
          const leftIncludes = (leftExcludes.join("\n") + content).split("\n");
          this.sendProtocol({
            method: Events.styleSheetAdded,
            params: {
              header: {
                frameId: Page.MAINFRAME_ID,
                styleSheetId,
                sourceURL: location.href,
                origin: "regular",
                disabled: false,
                isConstructed: false,
                isInline: true,
                isMutable: false,
                length: content.length,
                startLine: leftExcludes.length - 1,
                startColumn: leftExcludes[leftExcludes.length - 1].length,
                endLine: leftIncludes.length - 1,
                endColumn: leftIncludes[leftIncludes.length - 1].length,
                title: style.title,
              },
            },
          });
        }
      }
    });
  }

  /**
   * fetch the source content of the css file
   */
  private fetchStyleSource(styleSheetId: string, url: string) {
    const xhr = new XMLHttpRequest();
    xhr.$$requestType = "Stylesheet";
    xhr.onload = () => {
      const content = xhr.responseText;
      this.styles.set(styleSheetId, content);
      this.styleRules.set(styleSheetId, this.parseStyleRules(content));
      this.sendProtocol({
        method: Events.styleSheetAdded,
        params: {
          header: {
            frameId: Page.MAINFRAME_ID,
            styleSheetId,
            sourceURL: url,
            origin: "regular",
            disabled: false,
            isConstructed: false,
            isInline: false,
            isMutable: false,
            length: content.length,
            startLine: 0,
            endLine: content.split("\n").length - 1,
            startColumn: 0,
            endColumn:
              content.split("\n").length - content.lastIndexOf("\n") - 1 - 1,
          },
        },
      });
    };
    xhr.onerror = () => {
      this.styles.set(styleSheetId, "Cannot get style source code");
      this.styleRules.set(styleSheetId, this.parseStyleRules(""));
    };

    xhr.open("GET", url);
    xhr.send();
  }

  /**
   * parse CSS rule
   */
  private parseStyleRules(content: string): StyleRule[] {
    const tokenList: {
      token: string;
      media: string;
      line: number;
      column: number;
    }[] = [];
    for (
      let i = 0, line = 0, column = 0, brackets = 0, media = "", token = "";
      i < content.length;
      i++
    ) {
      const pointer = content[i];
      switch (pointer) {
        case "{": {
          brackets += 1;
          column += 1;
          if ((!media && brackets === 1) || (media && brackets === 2)) {
            tokenList.push({ token, media, line, column });
            token = "";
          } else if (media && brackets === 1) {
            // nothing to do
          } else {
            token += pointer;
          }
          break;
        }
        case "}": {
          brackets -= 1;
          if ((!media && brackets === 0) || (media && brackets === 1)) {
            tokenList.push({ token, media, line, column });
            token = "";
          } else if (media && brackets === 0) {
            media = "";
          } else {
            token += pointer;
          }
          column += 1;
          break;
        }
        case "@": {
          if (content.substring(i, i + 7) === "@media ") {
            media += token + pointer;
            token = "";
          } else {
            token += pointer;
          }
          column += 1;
          break;
        }
        case "\n": {
          if (media && brackets === 0) {
            media += pointer;
          } else {
            token += pointer;
          }
          column = 0;
          line += 1;
          break;
        }
        default: {
          if (media && brackets === 0) {
            media += pointer;
          } else {
            token += pointer;
          }
          column += 1;
        }
      }
    }

    const rules = [];
    for (let j = 0; j < tokenList.length; j += 2) {
      const rule: StyleRule = {
        selectorText: tokenList[j].token.trim(),
        cssText: `${tokenList[j].token}{${tokenList[j + 1].token}}`.trim(),
        range: {
          startLine: tokenList[j].line,
          startColumn: tokenList[j].column,
          endLine: tokenList[j + 1].line,
          endColumn: tokenList[j + 1].column,
        },
      };
      if (tokenList[j].media) {
        rule.media = [
          {
            source: "mediaRule",
            text: tokenList[j].media
              .substring(tokenList[j].media.indexOf(" "))
              .trim(),
          },
        ];
      }
      rules.push(rule);
    }

    return rules;
  }

  /**
   * Modify style sheet
   * @private
   * @param {Object} styleSheet
   * @param {String} styleContent
   */
  private modifyStyleSheetRule(styleSheet: StyleSheet, styleContent: string) {
    if (styleSheet.ownerNode?.parentNode) {
      if (!styleSheet.devToolsOverrideStyle) {
        styleSheet.disabled = true;
        styleSheet.devToolsOverrideStyle = document.createElement("style");
        styleSheet.devToolsOverrideStyle.className = DEVTOOL_STYLESHEET;
        styleSheet.ownerNode.parentNode.insertBefore(
          styleSheet.devToolsOverrideStyle,
          styleSheet.ownerNode.nextSibling,
        );
      }
      styleSheet.devToolsOverrideStyle.innerHTML = styleContent;
    }
  }

  /**
   * Get the unique id of the style
   */
  private getStyleSheetId(node?: Node): string {
    if (node) {
      const nodeId = nodes.getIdByNode(node);
      let styleSheetId = stylesheet.getInlineStyleSheetId(nodeId);
      if (!styleSheetId) {
        styleSheetId = `${(this.styleSheetId += 1)}`;
        stylesheet.setInlineStyleSheetId(nodeId, styleSheetId);
      }
      return styleSheetId;
    }
    return `${(this.styleSheetId += 1)}`;
  }

  /**
   * Get the matching style of the DOM node
   */
  public getMatchedStylesForNode({ nodeId }: { nodeId: number }) {
    const node = nodes.getNodeById(nodeId);
    if (
      !isElement(node) &&
      !["::before", "::after"].includes(node.nodeName?.toLowerCase())
    )
      return;

    const matchedCSSRules: {
      matchingSelectors: number[];
      rule: CSSRule;
      specificityArray: SpecificityArray;
    }[] = [];
    const styleSheets = Array.from(document.styleSheets);
    const pushMatchedCSSRules = (styleSheetId: string, rule: StyleRule) => {
      if (
        rule.media &&
        rule.media.length &&
        !rule.media.find((query) => window.matchMedia(query.text).matches)
      )
        return;
      if (
        (isElement(node) && isMatches(node, rule.selectorText)) ||
        (node.nodeName?.toLowerCase() === "::before" &&
          rule.selectorText.includes(":before")) ||
        (node.nodeName?.toLowerCase() === "::after" &&
          rule.selectorText.includes(":after"))
      ) {
        const { index, specificityArray, cssRule } = CSS.formatCssRule(
          styleSheetId,
          rule,
          node,
        );
        matchedCSSRules.push({
          matchingSelectors: [index],
          rule: cssRule,
          specificityArray,
        });
      }
    };

    styleSheets.forEach((style) => {
      const styleSheetId = style.styleSheetId;
      if (!styleSheetId) return;

      const rules = this.styleRules.get(styleSheetId);
      if (rules) {
        rules.forEach((rule) => pushMatchedCSSRules(styleSheetId, rule));
      }
    });

    return {
      matchedCSSRules: matchedCSSRules.sort((a, b) =>
        compare(a.specificityArray, b.specificityArray),
      ),
      ...this.getInlineStylesForNode({ nodeId }),
    };
  }

  /**
   * Get the inline style of a DOM node
   * @public
   * @param {Object} params
   * @param {Number} params.nodeId DOM node id
   */
  public getInlineStylesForNode({ nodeId }: { nodeId: number }) {
    const node = nodes.getNodeById(nodeId);
    if (!isHTMLElement(node)) return;

    const { style } = node || {};
    const cssText = node.getAttribute("style") || "";

    const cssTextLines = cssText.split("\n");
    const cssProperties = CSS.formatCssProperties(cssText);

    cssProperties.forEach((css) => {
      if (!css) return;
      const { name, value } = css;
      const { text, range } = CSS.getInlineStyleRange(name, value, cssText);

      css.text = text;
      css.range = range;

      if (text.startsWith("/*")) {
        css.disabled = true;
      } else {
        css.disabled = false;
        css.implicit = false;
        css.parsedOk = !!style[name as any];
      }
    });

    return {
      inlineStyle: {
        styleSheetId: this.getStyleSheetId(node),
        cssText,
        cssProperties,
        shorthandEntries: [],
        range: {
          startLine: 0,
          startColumn: 0,
          endLine: cssTextLines.length - 1,
          endColumn: cssTextLines[cssTextLines.length - 1].length,
        },
      },
    };
  }

  /**
   * Get the computed style of a DOM node
   * @public
   * @param {Object} param
   * @param {Number} param.nodeId DOM node id
   */
  public getComputedStyleForNode({ nodeId }: { nodeId: number }) {
    const node = nodes.getNodeById(nodeId);
    if (
      !isElement(node) &&
      !["::before", "::after"].includes(node.nodeName?.toLowerCase())
    )
      return;

    const _computedStyle = isElement(node)
      ? window.getComputedStyle(node)
      : isElement(node.parentNode)
        ? window.getComputedStyle(node.parentNode, node.nodeName)
        : [];
    const computedStyle = Array.from(_computedStyle).map((style) => ({
      name: style,
      value: _computedStyle[style as unknown as number],
    }));
    return { computedStyle };
  }

  /**
   * Get style content
   */
  public getStyleSheetText({ styleSheetId }: { styleSheetId: string }) {
    return {
      text: this.styles.get(styleSheetId),
    };
  }

  /**
   * Set css content
   */
  public setStyleTexts({
    edits,
  }: {
    edits: {
      styleSheetId: string;
      text: string;
      range: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      };
    }[];
  }) {
    const styles = edits.map((edit) => {
      const { styleSheetId, range } = edit;
      const text = edit.text.replace(/;+/g, ";");
      const nodeId = stylesheet.getInlineStyleNodeId(styleSheetId);
      if (nodeId) {
        const node = nodes.getNodeById(nodeId);
        if (isElement(node)) node.setAttribute("style", text);
        return this.getInlineStylesForNode({ nodeId })?.inlineStyle;
      }

      const styleSheet = stylesheet.getStyleSheetById(styleSheetId);
      const content = this.styles.get(styleSheetId);
      if (styleSheet && content) {
        const lines = content.split("\n");
        const newContent = [
          ...lines.slice(0, range.startLine),
          lines[range.startLine].substring(0, range.startColumn) +
            text +
            lines[range.endLine].substring(range.endColumn),
          ...lines.slice(range.endLine + 1),
        ].join("\n");

        this.styles.set(styleSheetId, newContent);
        this.styleRules.set(styleSheetId, this.parseStyleRules(newContent));

        const rules = this.styleRules.get(styleSheetId);
        if (rules) {
          const newRule = rules.find(
            (rule) =>
              rule.range.startLine === range.startLine &&
              rule.range.startColumn === range.startColumn,
          );

          if (newRule) {
            this.modifyStyleSheetRule(styleSheet, newContent);
            this.sendProtocol({
              method: Events.styleSheetChanged,
              params: { styleSheetId },
            });

            const cssText = /\{([\s\S]*)\}/.exec(newRule.cssText)?.[1];
            return {
              styleSheetId,
              cssText,
              cssProperties: CSS.formatCssProperties(cssText, newRule.range),
              shorthandEntries: [],
              range: newRule.range,
            };
          }
        }
      }

      return { styleSheetId };
    });

    return { styles };
  }

  /**
   * New styleSheet
   */
  public createStyleSheet({ frameId }: { frameId: string }) {
    const newStyleSheetId = this.getStyleSheetId();
    stylesheet.createStyleSheet(newStyleSheetId);

    this.sendProtocol({
      method: Events.styleSheetAdded,
      params: {
        header: {
          styleSheetId: newStyleSheetId,
          frameId,
          origin: "inspector",
          disabled: false,
          isConstructed: false,
          isInline: false,
          isMutable: false,
          length: 0,
          sourceURL: "",
          startLine: 0,
          endLine: 0,
          startColumn: 0,
          endColumn: 0,
          title: "",
        },
      },
    });

    return { styleSheetId: newStyleSheetId };
  }

  /**
   * Added selector->cssText rule
   * @public
   */
  public addRule({
    styleSheetId,
    ruleText,
    location,
  }: {
    styleSheetId: string;
    ruleText: string;
    location: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
  }) {
    const styleSheet = stylesheet.getStyleSheetById(styleSheetId);
    const content = this.styles.get(styleSheetId);
    if (styleSheet && content) {
      const lines = content.split("\n");
      const newContent = [
        ...lines.slice(0, location.startLine),
        lines[location.startLine].substring(0, location.startColumn) +
          ruleText +
          lines[location.endLine].substring(location.endColumn),
        ...lines.slice(location.endLine + 1),
      ].join("\n");

      this.styles.set(styleSheetId, newContent);
      this.styleRules.set(styleSheetId, this.parseStyleRules(newContent));

      const rules = this.styleRules.get(styleSheetId);
      if (rules) {
        const selectorText = ruleText.slice(0, ruleText.indexOf("{"));
        const selectorLines = selectorText.split("\n");
        const newRule = rules.find((rule) =>
          selectorLines.length === 1
            ? rule.range.startLine === location.startLine &&
              rule.range.startColumn ===
                location.startColumn - selectorText.length
            : rule.range.startLine ===
                location.startLine + selectorLines.length - 1 &&
              rule.range.startColumn ===
                selectorLines[selectorLines.length - 1].length + 1,
        );

        if (newRule) {
          this.modifyStyleSheetRule(styleSheet, newContent);
          this.sendProtocol({
            method: Events.styleSheetChanged,
            params: { styleSheetId },
          });

          const cssText = /\{([\s\S]*)\}/.exec(newRule.cssText)?.[1];
          return {
            rule: {
              styleSheetId,
              style: {
                styleSheetId,
                cssText,
                cssProperties: CSS.formatCssProperties(cssText, newRule.range),
                shorthandEntries: [],
                range: newRule.range,
              },
              selectorList: {
                selectors: selectorText
                  .split(",")
                  .map((item) => ({ text: item.trim() })),
                text: newRule.selectorText.trim(),
              },
            },
          };
        }
      }
    }
  }
}
