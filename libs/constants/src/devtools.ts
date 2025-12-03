export const MSG_ID = {
  NETWORK: {
    ENABLE: 1,
    SET_ATTACH_DEBUG_STACK: 2,
    CLEAR_ACCEPTED_ENCODINGS_OVERRIDE: 24,
  },
  DOM: {
    ENABLE: 6,
    GET_DOCUMENT: 32,
  },
  Runtime: {
    enable: 5,
    runIfWaitingForDebugger: 27,
  },
  Page: {
    enable: 3,
    getResourceTree: 4,
  },
  Screen: {
    startPreview: 7,
  },
} as const;
