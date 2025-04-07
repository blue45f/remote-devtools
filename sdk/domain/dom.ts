/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { DEVTOOL_OVERLAY, IGNORE_NODE } from "../common/constant";
import nodes from "../common/nodes";
import { getObjectById } from "../common/remoteObject";
import { isElement } from "../common/utils";

import { BaseDomain } from "./base";
import { Overlay } from "./overlay";
import { Events } from "./protocol";

declare global {
  interface Window {
    $: typeof document.querySelector;
    $$: typeof document.querySelectorAll;
    $x<K extends keyof HTMLElementTagNameMap>(selector: K): (Node | null)[];
    $0: Node;
    $$inspectMode: string;
  }
}

export class Dom extends BaseDomain {
  public readonly namespace = "DOM";
  private searchId = 0;
  private searchRet = new Map<number, Element[]>();
  private currentSearchKey = "";

  /**
   * set $, $$ and $x methods
   * @static
   */
  private static set$Function() {
    if (typeof window.$ !== "function") {
      window.$ = function <K extends keyof HTMLElementTagNameMap>(selector: K) {
        return document.querySelector(selector);
      };
    }

    if (typeof window.$$ !== "function") {
      window.$$ = function <K extends keyof HTMLElementTagNameMap>(
        selector: K,
      ) {
        return document.querySelectorAll(selector);
      };
    }

    if (typeof window.$x !== "function") {
      window.$x = function <K extends keyof HTMLElementTagNameMap>(
        selector: K,
      ) {
        const xpathResult = document.evaluate(
          selector,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null,
        );
        const elements = [];

        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          elements.push(xpathResult.snapshotItem(i));
        }

        return elements;
      };
    }
  }

  private enabled = false;

  public enable() {
    if (this.enabled) return;
    this.enabled = true;
    nodes.init();
    this.nodeObserver();
    this.setDomInspect();
    Dom.set$Function();
  }

  public getDocument() {
    return {
      root: nodes.collectNodes(document, Infinity),
    };
  }

  public requestChildNodes({ nodeId }: { nodeId: number }) {
    if (nodes.hasRequestedChildNode.has(nodeId)) {
      return;
    }
    nodes.hasRequestedChildNode.add(nodeId);
    this.sendProtocol({
      method: Events.setChildNodes,
      params: {
        parentId: nodeId,
        nodes: nodes.getChildNodes(
          nodes.getNodeById(nodeId),
          this.recordMode ? Infinity : 2,
        ),
      },
    });
  }

  public getOuterHTML({ nodeId }: { nodeId: number }) {
    return {
      outerHTML: (nodes.getNodeById(nodeId) as HTMLElement).outerHTML,
    };
  }

  public setOuterHTML({
    nodeId,
    outerHTML,
  }: {
    nodeId: number;
    outerHTML: string;
  }) {
    (nodes.getNodeById(nodeId) as HTMLElement).outerHTML = outerHTML;
  }

  /**
   * @param {Object} param
   * @param {Number} nodeId DOM Node Id
   * @param {String} text attribute text，eg: class="test" style="color:red;" data-index="1"
   */
  public setAttributesAsText({
    nodeId,
    text,
  }: {
    nodeId: number;
    text: string;
  }) {
    const node = nodes.getNodeById(nodeId);
    if (!isElement(node)) return;
    if (text) {
      text
        .split(" ")
        .filter((item) => item)
        .forEach((item) => {
          const [name, value] = item.split("=");
          node.setAttribute(name, value.replace(/["']/g, ""));
        });
    } else {
      Array.from(node.attributes).forEach((attr) =>
        node.removeAttribute(attr.name),
      );
    }
  }

  public requestNode({ objectId }: { objectId: string }) {
    const node = getObjectById(objectId);
    if (!node) throw new Error("Node not found");
    const nodeId = nodes.getIdByNode(node);
    return { nodeId };
  }

  public setInspectedNode({ nodeId }: { nodeId: number }) {
    window.$0 = nodes.getNodeById(nodeId);
  }

  public removeNode({ nodeId }: { nodeId: number }) {
    const node = nodes.getNodeById(nodeId);
    node?.parentNode?.removeChild(node);
  }

  public pushNodesByBackendIdsToFrontend({
    backendNodeIds,
  }: {
    backendNodeIds: number[];
  }) {
    return {
      nodeIds: backendNodeIds,
    };
  }

  public performSearch({ query }: { query: string }) {
    let ret = this.searchRet.get(this.searchId) ?? [];

    if (this.currentSearchKey !== query) {
      this.currentSearchKey = query;
      const allNodes = document.querySelectorAll("*");
      ret = Array.from(allNodes).filter((node) => {
        if (!nodes.isNode(node)) return false;

        // element node
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.tagName.toLowerCase().includes(query)
        ) {
          return true;
        }

        // match attributes
        for (let i = 0; i < node.attributes.length; i++) {
          const curr = node.attributes[i];
          if (curr.name.includes(query) || curr.value.includes(query)) {
            return true;
          }
        }

        return false;
      });

      this.searchRet.delete(this.searchId);
      // eslint-disable-next-line no-plusplus
      this.searchRet.set(++this.searchId, ret);
    }

    return {
      searchId: this.searchId,
      resultCount: ret.length,
    };
  }

  public getSearchResults({
    fromIndex,
    toIndex,
    searchId,
  }: {
    fromIndex: number;
    toIndex: number;
    searchId: number;
  }) {
    const ret = this.searchRet.get(searchId)?.slice(fromIndex, toIndex) ?? [];
    const nodeIds: number[] = [];
    ret.forEach((node: Node) => {
      this.expandNode(node);
      nodeIds.push(nodes.getIdByNode(node));
    });

    return { nodeIds };
  }

  public discardSearchResults({ searchId }: { searchId: number }) {
    this.searchRet.delete(searchId);
  }

  public getNodeForLocation({ x, y }: { x: number; y: number }) {
    const hoverNode = document.elementFromPoint(x, y);
    if (hoverNode) {
      this.expandNode(hoverNode);
      const nodeId = nodes.getIdByNode(hoverNode);
      return {
        frameId: 1,
        backendNodeId: nodeId,
        nodeId,
      };
    }
  }

  public setNodeValue({ nodeId, value }: { nodeId: number; value: string }) {
    const node = nodes.getNodeById(nodeId);
    node.nodeValue = value;
  }

  public getBoxModel({ nodeId }: { nodeId: number }) {
    const node = nodes.getNodeById(nodeId);
    if (!isElement(node)) return;
    const styles = window.getComputedStyle(node);

    const margin = Overlay.getStylePropertyValue(
      ["margin-top", "margin-right", "margin-bottom", "margin-left"],
      styles,
    );
    const padding = Overlay.getStylePropertyValue(
      ["padding-top", "padding-right", "padding-bottom", "padding-left"],
      styles,
    );
    const border = Overlay.getStylePropertyValue(
      [
        "border-top-width",
        "border-right-width",
        "border-bottom-width",
        "border-left-width",
      ],
      styles,
    );

    const { left, right, top, bottom, width, height } =
      node.getBoundingClientRect();

    return {
      model: {
        width,
        height,
        content: [
          left + border[3] + padding[3],
          top + border[0] + padding[0],
          right - border[1] - padding[1],
          top + border[0] + padding[0],
          right - border[1] - padding[1],
          bottom - border[2] - padding[2],
          left + border[3] + padding[3],
          bottom - border[2] - padding[2],
        ],
        padding: [
          left + border[3],
          top + border[0],
          right - border[1],
          top + border[0],
          right - border[1],
          bottom - border[2],
          left + border[3],
          bottom - border[2],
        ],
        border: [left, top, right, top, right, bottom, left, bottom],
        margin: [
          left - margin[3],
          top - margin[0],
          right + margin[1],
          top - margin[0],
          right + margin[1],
          bottom + margin[2],
          left - margin[3],
          bottom + margin[2],
        ],
      },
    };
  }

  private expandNode(node: Node | null) {
    const nodeIds = [];
    while (node && !nodes.hasNode(node)) {
      const nodeId = nodes.getIdByNode(node);
      nodeIds.unshift(nodeId);
      node = node.parentNode;
    }
    if (!node) return;
    nodeIds.unshift(nodes.getIdByNode(node));

    nodeIds.forEach((nodeId) => {
      this.requestChildNodes({ nodeId });
    });
  }

  private setDomInspect() {
    document.addEventListener(
      "click",
      (e) => {
        if (window.$$inspectMode !== "searchForNode") return;

        e.stopPropagation();
        e.preventDefault();

        const previousNode = (e.target as Element).parentNode;
        const currentNodeId = nodes.getIdByNode(e.target as Element);

        this.expandNode(previousNode);

        this.sendProtocol({
          method: Events.nodeHighlightRequested,
          params: {
            nodeId: currentNodeId,
          },
        });

        this.sendProtocol({
          method: Events.inspectNodeRequested,
          params: {
            backendNodeId: currentNodeId,
          },
        });
        const element = document.getElementById(DEVTOOL_OVERLAY);
        if (element) element.style.display = "none";
      },
      true,
    );
  }

  private nodeObserver() {
    const isDevtoolMutation = ({
      target,
      addedNodes,
      removedNodes,
    }: MutationRecord) => {
      if (
        isElement(target) &&
        IGNORE_NODE.includes(target.getAttribute?.("class") ?? "")
      )
        return true;
      if (
        addedNodes[0] &&
        isElement(addedNodes[0]) &&
        IGNORE_NODE.includes(addedNodes[0].getAttribute?.("class") ?? "")
      )
        return true;
      if (
        removedNodes[0] &&
        isElement(removedNodes[0]) &&
        IGNORE_NODE.includes(removedNodes[0].getAttribute?.("class") ?? "")
      )
        return true;
      return false;
    };

    const callbackForRealtime = (mutationList: MutationRecord[]) => {
      mutationList.forEach((mutation) => {
        const { attributeName, target, type, addedNodes, removedNodes } =
          mutation;

        // Ignore devtool dom changes
        if (isDevtoolMutation(mutation)) return;
        // svg 내부의 요소가 변경되는 경우는 무시 (로딩 스피너 등)
        if (isElement(target) && !!target.closest("svg")) return;

        const parentNodeId = nodes.getIdByNode(target);

        const updateChildNodeCount = () => {
          this.sendProtocol({
            method: Events.childNodeCountUpdated,
            params: {
              nodeId: parentNodeId,
              childNodeCount: nodes.getChildNodes(target).length,
            },
          });
        };

        switch (type) {
          case "childList":
            addedNodes.forEach((node) => {
              const prevNode = nodes.getPreviousNode(node);
              updateChildNodeCount();
              if (!prevNode) {
                return this.requestChildNodes({ nodeId: parentNodeId });
              }
              this.sendProtocol({
                method: Events.childNodeInserted,
                params: {
                  node: nodes.collectNodes(
                    node,
                    this.recordMode ? Infinity : 1,
                  ),
                  parentNodeId,
                  previousNodeId: nodes.getIdByNode(prevNode),
                },
              });
            });

            removedNodes.forEach((node) => {
              updateChildNodeCount();
              const nodeId = nodes.getIdByNode(node);
              this.sendProtocol({
                method: Events.childNodeRemoved,
                params: {
                  nodeId,
                  parentNodeId,
                },
              });
            });

            break;
          case "attributes":
            // eslint-disable-next-line
            const value = isElement(target) ? target.getAttribute(attributeName ?? '') : ''
            this.sendProtocol({
              method: value
                ? Events.attributeModified
                : Events.attributeRemoved,
              params: {
                nodeId: parentNodeId,
                value: value || undefined,
                name: attributeName,
              },
            });
            break;

          case "characterData":
            this.sendProtocol({
              method: Events.characterDataModified,
              params: {
                nodeId: parentNodeId,
                characterData: target.nodeValue,
              },
            });
            break;
        }
      });
    };

    const callbackForRecord = debounce(() => {
      this.sendProtocol({
        method: Events.domUpdated,
        params: nodes.collectNodes(document, Infinity),
      });
    }, 1000);

    const callback = (mutationList: MutationRecord[]) => {
      if (this.socket?.readyState === WebSocket.CLOSED) return;
      return this.recordMode
        ? callbackForRecord()
        : callbackForRealtime(mutationList);
    };

    const observer = new MutationObserver(callback);

    // Observe the changes of the document
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }
}

function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}
