export type CallArgument = {
  value?: any; // Primitive or serializable JS object.
  unserializableValue?: UnserializableValue; // Value that can't be JSON-stringified.
  objectId?: RemoteObjectId; // Remote object handle.
};

export type CallFrame = {
  functionName: string; // JS function name.
  scriptId: ScriptId; // JS script id.
  url: string; // Script name or URL.
  lineNumber: number; // Script line number (0-based).
  columnNumber: number; // Script column number (0-based).
};

export type DeepSerializedValue = {
  type:
    | "undefined"
    | "null"
    | "string"
    | "number"
    | "boolean"
    | "bigint"
    | "regexp"
    | "date"
    | "symbol"
    | "array"
    | "object"
    | "function"
    | "map"
    | "set"
    | "weakmap"
    | "weakset"
    | "error"
    | "proxy"
    | "promise"
    | "typedarray"
    | "arraybuffer"
    | "node"
    | "window"
    | "generator";
  value: any;
  objectId?: string;
  weakLocalObjectReference?: number; // Set if encountered more than once.
};

export type ExceptionDetails = {
  exceptionId: number;
  text: string; // Exception text.
  lineNumber: number; // Exception location line number (0-based).
  columnNumber: number; // Exception location column number (0-based).
  scriptId?: ScriptId;
  url?: string;
  stackTrace?: StackTrace;
  exception?: RemoteObject;
  executionContextId?: ExecutionContextId;
  exceptionMetaData?: Record<string, any>; // Associated metadata, experimental.
};

export type ExecutionContextDescription = {
  id: ExecutionContextId;
  origin: string;
  name: string; // Human-readable name.
  uniqueId?: string; // Unique identifier across processes, experimental.
  auxData?: {
    isDefault: boolean;
    type: "default" | "isolated" | "worker";
    frameId: string;
  };
};

export type InternalPropertyDescriptor = {
  name: string;
  value?: RemoteObject;
};

export type PropertyDescriptor = {
  name: string;
  value?: RemoteObject;
  writable?: boolean;
  get?: RemoteObject;
  set?: RemoteObject;
  configurable?: boolean;
  enumerable?: boolean;
  wasThrown?: boolean;
  isOwn?: boolean;
  symbol?: RemoteObject;
};

export type RemoteObject = {
  type:
    | "object"
    | "function"
    | "undefined"
    | "string"
    | "number"
    | "boolean"
    | "symbol"
    | "bigint";
  subtype?: Subtype;
  className?: string;
  value?: any;
  unserializableValue?: UnserializableValue;
  description?: string;
  deepSerializedValue?: DeepSerializedValue;
  objectId?: RemoteObjectId;
  preview?: ObjectPreview;
  customPreview?: CustomPreview;
};

export type SerializationOptions = {
  serialization: "deep" | "json" | "idOnly";
  maxDepth?: number;
  additionalParameters?: Record<string, string | number>;
};

export type StackTrace = {
  description?: string;
  callFrames: CallFrame[];
  parent?: StackTrace;
  parentId?: StackTraceId;
};

export type UnserializableValue = string;

export type CustomPreview = {
  header: string;
  bodyGetterId: RemoteObjectId;
};

export type EntryPreview = {
  key: ObjectPreview;
  value: ObjectPreview;
};

export type ObjectPreview = {
  type:
    | "object"
    | "function"
    | "undefined"
    | "string"
    | "number"
    | "boolean"
    | "symbol"
    | "bigint";
  subtype?: Subtype;
  description?: string;
  overflow?: boolean;
  properties?: PropertyPreview[];
  entries?: EntryPreview[];
};

export type PropertyPreview = {
  name: string;
  type:
    | "object"
    | "function"
    | "undefined"
    | "string"
    | "number"
    | "boolean"
    | "symbol"
    | "accessor"
    | "bigint";
  value?: string;
  valuePreview?: ObjectPreview;
  subtype?: Subtype;
};

export type PrivatePropertyDescriptor = {
  name: string;
  value?: RemoteObject;
  get?: RemoteObject;
  set?: RemoteObject;
};

export type StackTraceId = {
  id: string;
  debuggerId?: UniqueDebuggerId;
};

export type UniqueDebuggerId = string;

export type TimeDelta = number;
export type Timestamp = number;

export type RemoteObjectId = string;
export type ScriptId = string;
export type ExecutionContextId = number;

export type Subtype =
  | "array"
  | "null"
  | "node"
  | "regexp"
  | "date"
  | "map"
  | "set"
  | "weakmap"
  | "weakset"
  | "iterator"
  | "generator"
  | "error"
  | "proxy"
  | "promise"
  | "typedarray"
  | "arraybuffer"
  | "dataview"
  | "webassemblymemory"
  | "wasmvalue"
  | "";

///

export type GetObjectPropertiesParams = {
  objectId: string;
  ownProperties: boolean;
  accessorPropertiesOnly: boolean;
  generatePreview: boolean;
  nonIndexedPropertiesOnly: boolean;
};
