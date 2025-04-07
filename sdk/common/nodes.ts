import { IGNORE_NODE } from "./constant";
import { isElement } from "./utils";

class Nodes {
  // DOM node id collection
  nodeIds = new Map<Node, number>();

  // DOM node collection
  nodes = new Map<number, Node>();

  hasRequestedChildNode = new Set();

  currentId = 0;

  /**
   * Is it a node
   * @public
   * @param {HTMLElement} node DOM
   */
  isNode(node: Node | null): boolean {
    if (!node) return false;
    // Ignore DOM nodes for debugging
    if (
      isElement(node) &&
      node.getAttribute &&
      IGNORE_NODE.includes(node.getAttribute("class") ?? "")
    )
      return false;
    // non-text node
    if (node.nodeType !== Node.TEXT_NODE) return true;
    // non-empty text node
    if (
      node.nodeType === Node.TEXT_NODE &&
      (node.nodeValue || "").trim() !== ""
    )
      return true;
    return false;
  }

  create(nodeId: number, node: Node) {
    this.nodeIds.set(node, nodeId);
    this.nodes.set(nodeId, node);
  }

  init() {
    this.nodeIds.clear();
    this.nodes.clear();
    this.hasRequestedChildNode.clear();
  }

  hasNode(node: Node) {
    return this.nodeIds.has(node);
  }

  /**
   * @public
   * @param {Number} nodeId Unique id of DOM
   */
  getNodeById(nodeId: number): Node {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);
    return node;
  }

  /**
   * @public
   * @param {HTMLElement} node DOM
   */
  getIdByNode(node: Node): number {
    let nodeId = this.nodeIds.get(node);
    if (nodeId) return nodeId;

    // eslint-disable-next-line
    nodeId = this.currentId++;
    this.create(nodeId, node);

    return nodeId;
  }

  /**
   * Collect child nodes
   * @public
   * @param {Element} node DOM node
   * @param {Number} depth child node depth
   */
  public collectNodes(node: Node, depth = 2) {
    const nodeId = this.getIdByNode(node);
    const { nodeType, nodeName, nodeValue, parentNode, childNodes } = node;
    const res: Pick<HTMLElement, "nodeType" | "nodeName" | "nodeValue"> & {
      nodeId: number;
      localName?: string;
      backendNodeId: number;
      childNodeCount: number;
      parentId?: number;
      attributes?: string[];
      children?: (typeof res)[];
      pseudoElements?: (typeof res)[];
    } = {
      nodeId,
      nodeType,
      nodeName,
      localName: isElement(node) ? node.localName : undefined,
      nodeValue,
      backendNodeId: nodeId,
      childNodeCount: childNodes.length,
    };

    if (node instanceof HTMLElement) {
      res.attributes = Array.from(node.attributes).reduce(
        (pre, curr) => pre.concat(curr.name, curr.value),
        [] as string[],
      );
    }

    if (parentNode) {
      res.parentId = this.getIdByNode(parentNode as HTMLElement);
    }

    if (depth > 0) {
      res.children = this.getChildNodes(node, depth);
    }

    if (isElement(node)) {
      const beforeContent = window.getComputedStyle(node, "::before").content;
      const afterContent = window.getComputedStyle(node, "::after").content;
      const pseudoTypes = [];
      if (beforeContent !== "none") {
        pseudoTypes.push("before");
      }
      if (afterContent !== "none") {
        pseudoTypes.push("after");
      }
      if (pseudoTypes.length) {
        res.pseudoElements = pseudoTypes.map((pseudoType) => {
          const pseudoNodeName = `::${pseudoType}`;
          const pseudoNodeId = this.getIdByNode({
            nodeName: pseudoNodeName,
            parentNode: node,
          } as unknown as HTMLElement);
          return {
            pseudoType,
            nodeId: pseudoNodeId,
            nodeName: pseudoNodeName,
            nodeType,
            nodeValue,
            backendNodeId: pseudoNodeId,
            childNodeCount: 0,
            attributes: [],
          };
        });
      }
    }

    return res;
  }

  /**
   * Collect DOM child elements
   * @public
   * @param {HTMLElement} node DOM
   * @param {Number} depth
   */
  getChildNodes(node: Node, depth = 1) {
    return Array.from(node.childNodes)
      .filter(this.isNode)
      .map((childNode) => this.collectNodes(childNode, depth - 1));
  }

  /**
   * Get the former sibling node of DOM
   * @public
   * @param {HTMLElement} node DOM
   */
  getPreviousNode(node: Node) {
    let previousNode = node.previousSibling;
    if (!previousNode) return;

    while (!this.isNode(previousNode) && previousNode?.previousSibling) {
      previousNode = previousNode.previousSibling;
    }

    return previousNode;
  }
}

export default new Nodes();
