// Implemented CDP
export default {
  CSS: [
    "enable",
    "getStyleSheetText",
    "getMatchedStylesForNode",
    "getComputedStyleForNode",
    "getInlineStylesForNode",
    "getDynamicLink",
    "addRule",
    "createStyleSheet",
    "setStyleTexts",
  ],
  Debugger: ["enable", "getScriptSource", "getDynamicScript"],
  DOMStorage: [
    "enable",
    "getDOMStorageItems",
    "removeDOMStorageItem",
    "clear",
    "setDOMStorageItem",
  ],
  Storage: ["getStorageKeyForFrame"],
  DOM: [
    "enable",
    "getDocument",
    "removeNode",
    "requestChildNodes",
    "requestNode",
    "getOuterHTML",
    "setOuterHTML",
    "setAttributesAsText",
    "setInspectedNode",
    "pushNodesByBackendIdsToFrontend",
    "performSearch",
    "getSearchResults",
    "discardSearchResults",
    "getNodeForLocation",
    "setNodeValue",
    "getBoxModel",
  ],
  DOMDebugger: ["getEventListeners"],
  Network: ["enable", "getCookies", "getResponseBody"],
  Overlay: ["enable", "highlightNode", "hideHighlight", "setInspectMode"],
  Page: [
    "enable",
    // 스크린 캐스트 적용시 콘솔에 에러가 다수 기록되어 기능 임시 제거
    // 'startScreencast', 'stopScreencast',
    "getResourceTree",
    "getResourceContent",
  ],
  Runtime: [
    "enable",
    "evaluate",
    "getProperties",
    "releaseObject",
    "callFunctionOn",
  ],
  ScreenPreview: ["startPreview", "stopPreview"], // ScreenPreview is a custom protocol
  SessionReplay: ["startRecording", "stopRecording", "onRoomConnected"], // SessionReplay is a custom protocol
};

export const Events = {
  styleSheetAdded: "CSS.styleSheetAdded",
  styleSheetChanged: "CSS.styleSheetChanged",
  scriptParsed: "Debugger.scriptParsed",

  domStorageItemAdded: "DOMStorage.domStorageItemAdded",
  domStorageItemRemoved: "DOMStorage.domStorageItemRemoved",
  domStorageItemsCleared: "DOMStorage.domStorageItemsCleared",
  domStorageItemUpdated: "DOMStorage.domStorageItemUpdated",

  setChildNodes: "DOM.setChildNodes",
  childNodeCountUpdated: "DOM.childNodeCountUpdated",
  childNodeInserted: "DOM.childNodeInserted",
  childNodeRemoved: "DOM.childNodeRemoved",
  attributeModified: "DOM.attributeModified",
  attributeRemoved: "DOM.attributeRemoved",
  characterDataModified: "DOM.characterDataModified",

  domUpdated: "DOM.updated", // Dom DB업데이트를 위한 Custom event

  requestWillBeSent: "Network.requestWillBeSent",
  responseReceivedExtraInfo: "Network.responseReceivedExtraInfo",
  responseReceived: "Network.responseReceived",
  loadingFinished: "Network.loadingFinished",

  screencastFrame: "Page.screencastFrame",

  executionContextCreated: "Runtime.executionContextCreated",
  consoleAPICalled: "Runtime.consoleAPICalled",
  exceptionThrown: "Runtime.exceptionThrown",
  objectPropertiesSnapshot: "Runtime.objectPropertiesSnapshot",

  nodeHighlightRequested: "Overlay.nodeHighlightRequested",
  inspectNodeRequested: "Overlay.inspectNodeRequested",

  captured: "ScreenPreview.captured",
  syncScroll: "ScreenPreview.syncScroll",
  syncMouse: "ScreenPreview.syncMouse",
};
