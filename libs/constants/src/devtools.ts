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
  RUNTIME: {
    ENABLE: 5,
    RUN_IF_WAITING_FOR_DEBUGGER: 27,
  },
  PAGE: {
    ENABLE: 3,
    GET_RESOURCE_TREE: 4,
  },
  SCREEN: {
    START_PREVIEW: 7,
  },
} as const;
