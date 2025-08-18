import {
  GetObjectPropertiesParams,
  ObjectPreview,
  PropertyDescriptor,
  RemoteObject,
  Subtype,
} from "../domain/runtime.type";

const objectIds = new Map();
const objects = new Map();
const origins = new Map();
let currentId = 1;

// 객체 프로퍼티 스냅샷 저장 (녹화 세션 재생용)
const propertySnapshots = new Map<string, PropertyDescriptor[]>();

const getIdByObject = (object: any, origin: any) => {
  let id = objectIds.get(object);
  if (id) return id;

  // eslint-disable-next-line
  id = `${currentId++}`;
  objects.set(id, object);
  objectIds.set(object, id);
  origins.set(id, origin);
  return id;
};

const getRealType = (val: any): string => {
  const reg = /\[object\s+(.*)\]/;
  const res = reg.exec(Object.prototype.toString.call(val));
  return res ? res[1] : "";
};

const getSubType = (val: any): RemoteObject["subtype"] => {
  // DOM node type
  try {
    if (val && [1, 8, 9].includes(val.nodeType)) return "node";
  } catch {
    //
  }

  const realType = getRealType(val).toLowerCase() as Subtype;
  return [
    "array",
    "null",
    "regexp",
    "date",
    "map",
    "set",
    "weakmap",
    "weakset",
    "error",
    "proxy",
    "promise",
    "arraybuffer",
    "iterator",
    "generator",
  ].includes(realType)
    ? realType
    : "";
};

const getType = (
  val: unknown,
): {
  type: RemoteObject["type"];
  subtype: RemoteObject["subtype"];
} => ({
  type: typeof val,
  subtype: getSubType(val),
});

const getPreview = (
  val: any,
  others: any = {},
): Pick<ObjectPreview, "overflow" | "properties"> => {
  const { length = 5, origin = val } = others;

  const keys = Object.keys(val);
  const properties: ObjectPreview["properties"] = [];
  keys.slice(0, length).forEach((key) => {
    let subVal;
    try {
      subVal = origin[key];
    } catch (e) {
      //
    }

    const { type, subtype } = getType(subVal);
    if (type === "object") {
      if (subtype === "array") {
        subVal = `Array(${subVal.length})`;
      } else if (subtype === "null") {
        subVal = "null";
      } else if (["date", "regexp"].includes(subtype ?? "")) {
        subVal = subVal.toString();
      } else if (subtype === "node") {
        subVal = `#${subVal.nodeName}`;
      } else {
        subVal = subVal.constructor.name;
      }
    } else {
      subVal = subVal === undefined ? "undefined" : subVal.toString();
    }
    properties.push({
      name: key,
      type,
      subtype,
      value: subVal,
    });
  });

  return {
    overflow: keys.length > length,
    properties,
  };
};

export function objectFormat(
  val: any,
  others: { origin?: unknown; preview?: unknown },
): RemoteObject {
  const { origin = val, preview = false } = others;

  const { type, subtype } = getType(val);

  if (type === "undefined") return { type };

  if (type === "number")
    return { type, value: val, description: val.toString() };

  if (type === "string" || type === "boolean") return { type, value: val };

  if (type === "symbol") {
    return {
      type,
      objectId: getIdByObject(val, origin),
      description: val.toString(),
    };
  }

  if (subtype === "null") return { type, subtype, value: val };

  const res: RemoteObject = {
    type,
    subtype,
    objectId: getIdByObject(val, origin),
  };
  // Some different data types need to be processed separately
  if (type === "function") {
    res.className = "Function";
    res.description = val.toString();
    preview &&
      (res.preview = {
        type,
        subtype,
        description: val.toString(),
        ...getPreview(val, { origin }),
      });
    // Array
  } else if (subtype === "array") {
    res.className = "Array";
    res.description = `Array(${val.length})`;
    preview &&
      (res.preview = {
        type,
        subtype,
        description: `Array(${val.length})`,
        ...getPreview(val, { length: 100, origin }),
      });
    // Error - 녹화 세션 재생을 위해 objectId 없이 description만으로 표시
  } else if (subtype === "error") {
    // try-catch로 안전하게 Error 프로퍼티 접근
    let errorName = "Error";
    let errorMessage = "";
    let errorStack = "";

    try {
      errorName = val.name || val.constructor?.name || "Error";
    } catch {
      // 접근 실패 시 기본값 유지
    }

    try {
      errorMessage = val.message || "";
    } catch {
      // 접근 실패 시 기본값 유지
    }

    try {
      errorStack = val.stack || "";
    } catch {
      // 접근 실패 시 기본값 유지
    }

    // stack이 없으면 name: message 형식으로 생성
    if (!errorStack) {
      errorStack = errorMessage ? `${errorName}: ${errorMessage}` : errorName;
    }

    // Error 객체는 objectId 없이 description만으로 표시
    // 녹화 세션에서 objectId로 객체를 찾을 수 없으므로 description 기반으로 표시
    // objectId가 필요하면 프로퍼티 스냅샷으로 대체
    return {
      type,
      subtype,
      className: errorName,
      description: errorStack,
      // Error는 objectId 없이 전송하여 녹화 세션에서도 description으로 표시되도록 함
      preview: preview
        ? {
            type,
            subtype,
            description: errorStack,
            overflow: false,
            properties: [
              ...(errorMessage
                ? [
                    {
                      name: "message",
                      type: "string" as const,
                      value: errorMessage,
                    },
                  ]
                : []),
              ...(errorStack
                ? [
                    {
                      name: "stack",
                      type: "string" as const,
                      value:
                        errorStack.length > 100
                          ? errorStack.substring(0, 100) + "..."
                          : errorStack,
                    },
                  ]
                : []),
            ],
          }
        : undefined,
    };
    // HTML Element
  } else if (subtype === "node") {
    res.className = res.description = val.constructor.name;
    // Others
  } else {
    try {
      res.className = res.description = val.constructor.name;
    } catch {
      res.className = res.description = "";
    }
    preview &&
      (res.preview = {
        type,
        subtype,
        description: res.description,
        ...getPreview(val, { origin }),
      });
  }

  return res;
}

// Get object properties, the level can be infinitely deep
export function getObjectProperties(
  params: GetObjectPropertiesParams,
): PropertyDescriptor[] {
  // ownProperties identifies whether it is a property of the object itself
  const { accessorPropertiesOnly, generatePreview, objectId, ownProperties } =
    params;

  // 먼저 저장된 스냅샷에서 찾기 (녹화 세션 재생용)
  const snapshotKey = `${objectId}-${ownProperties}`;
  const snapshot = propertySnapshots.get(snapshotKey);
  if (snapshot) {
    return snapshot;
  }

  const curObject = objects.get(objectId);
  if (!curObject) {
    // 객체가 없으면 빈 배열 반환
    return [];
  }

  const origin = origins.get(objectId);
  const result: PropertyDescriptor[] = [];
  // eslint-disable-next-line no-proto
  const proto = curObject.__proto__;

  // If the current object has a __proto__ prototype and needs to obtain non-self attributes (that is, attributes under __proto__)
  // otherwise the current object
  const nextObject = proto && !ownProperties ? proto : curObject;

  const keys = Object.getOwnPropertyNames(nextObject);

  for (const key of keys) {
    // Skip key is an attribute of __proto__
    if (key === "__proto__") continue;
    const property: PropertyDescriptor = { name: key };

    let propVal;
    try {
      propVal = origin[key];
    } catch (e) {
      // nothing to do
    }

    const descriptor = Object.getOwnPropertyDescriptor(nextObject, key);

    if (accessorPropertiesOnly && !descriptor?.get && !descriptor?.set)
      continue;

    property.configurable = descriptor?.configurable;
    property.enumerable = descriptor?.enumerable;
    property.writable = descriptor?.writable;
    // eslint-disable-next-line no-prototype-builtins
    property.isOwn = ownProperties ? true : proto.hasOwnProperty(key);
    property.value = objectFormat(propVal, { preview: generatePreview });

    result.push(property);
  }

  // Append __proto__ prototype
  if (proto) {
    result.push({
      name: "__proto__",
      configurable: true,
      enumerable: false,
      isOwn: ownProperties,
      value: objectFormat(proto, { origin }),
    });
  }

  return result;
}

/**
 * 객체의 프로퍼티 스냅샷을 재귀적으로 생성
 * CDP Runtime.getProperties 스펙 준수:
 * https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-getProperties
 *
 * @param objectId 객체 ID
 * @param maxDepth 최대 깊이 (기본값: 3)
 * @param collectedSnapshots 수집된 모든 스냅샷 (objectId → PropertyDescriptor[])
 * @param visited 순환 참조 방지용 Set
 * @returns 수집된 모든 스냅샷 맵
 */
export function createPropertySnapshot(
  objectId: string,
  maxDepth: number = 3,
  collectedSnapshots: Record<string, PropertyDescriptor[]> = {},
  visited: Set<string> = new Set(),
): Record<string, PropertyDescriptor[]> {
  // 이미 방문한 objectId면 스킵 (순환 참조 방지)
  if (visited.has(objectId)) {
    return collectedSnapshots;
  }

  // 깊이 제한
  if (maxDepth < 0) {
    return collectedSnapshots;
  }

  const curObject = objects.get(objectId);
  if (!curObject) return collectedSnapshots;

  // 방문 표시
  visited.add(objectId);

  try {
    // DOM 노드, Window, Document 등은 스킵 (너무 많은 프로퍼티)
    if (
      curObject instanceof Node ||
      curObject === window ||
      curObject === document ||
      curObject instanceof Window
    ) {
      return collectedSnapshots;
    }

    const result: PropertyDescriptor[] = [];

    // Error 객체 특별 처리 (message, name, stack 명시적 추가)
    if (curObject instanceof Error) {
      // name 프로퍼티 (프로토타입에 있으므로 명시적으로 추가)
      result.push({
        name: "name",
        configurable: true,
        enumerable: false,
        writable: true,
        isOwn: true,
        value: { type: "string", value: curObject.name || "Error" },
      });

      // message 프로퍼티
      result.push({
        name: "message",
        configurable: true,
        enumerable: false,
        writable: true,
        isOwn: true,
        value: { type: "string", value: curObject.message || "" },
      });

      // stack 프로퍼티
      if (curObject.stack) {
        result.push({
          name: "stack",
          configurable: true,
          enumerable: false,
          writable: true,
          isOwn: true,
          value: { type: "string", value: curObject.stack },
        });
      }

      // 스냅샷 저장
      collectedSnapshots[objectId] = result;
      propertySnapshots.set(`${objectId}-true`, result);
      propertySnapshots.set(`${objectId}-false`, result);

      return collectedSnapshots;
    }

    // eslint-disable-next-line no-proto
    const proto = curObject.__proto__;

    let keys: string[];
    try {
      keys = Object.getOwnPropertyNames(curObject);
    } catch {
      return collectedSnapshots;
    }

    // 배열인 경우 length와 인덱스 프로퍼티 처리
    const isArray = Array.isArray(curObject);
    const maxKeys = isArray ? Math.min(keys.length, 100) : 50;
    const limitedKeys = keys.slice(0, maxKeys);

    for (const key of limitedKeys) {
      if (key === "__proto__") continue;

      const property: PropertyDescriptor = { name: key };

      let propVal;
      try {
        // 현재 객체에서 직접 프로퍼티 값 가져오기
        propVal = curObject[key];
      } catch {
        continue;
      }

      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(curObject, key);
      } catch {
        continue;
      }

      // CDP PropertyDescriptor 스펙에 맞게 설정
      property.configurable = descriptor?.configurable ?? false;
      property.enumerable = descriptor?.enumerable ?? false;
      property.writable = descriptor?.writable ?? false;
      property.isOwn = true;

      try {
        // RemoteObject 형식으로 값 포맷 (origin은 propVal 자체)
        property.value = objectFormat(propVal, { preview: true });

        // 하위 객체에 대해서도 스냅샷 생성 (재귀)
        if (
          maxDepth > 0 &&
          property.value?.objectId &&
          !visited.has(property.value.objectId)
        ) {
          createPropertySnapshot(
            property.value.objectId,
            maxDepth - 1,
            collectedSnapshots,
            visited,
          );
        }
      } catch {
        property.value = { type: "undefined" };
      }

      result.push(property);
    }

    // __proto__ 추가 (CDP 스펙에 맞게)
    if (proto && maxDepth > 0) {
      try {
        const protoValue = objectFormat(proto, { preview: true });
        result.push({
          name: "__proto__",
          configurable: true,
          enumerable: false,
          writable: false,
          isOwn: true,
          value: protoValue,
        });

        // __proto__의 프로퍼티도 수집 (선택적)
        if (protoValue.objectId && !visited.has(protoValue.objectId)) {
          createPropertySnapshot(
            protoValue.objectId,
            maxDepth - 1,
            collectedSnapshots,
            visited,
          );
        }
      } catch {
        // __proto__ 포맷 실패 시 무시
      }
    }

    // 이 objectId의 프로퍼티 저장
    if (result.length > 0) {
      collectedSnapshots[objectId] = result;
      // 로컬 캐시에도 저장
      propertySnapshots.set(`${objectId}-true`, result);
      propertySnapshots.set(`${objectId}-false`, result);
    }

    return collectedSnapshots;
  } catch {
    return collectedSnapshots;
  }
}

/**
 * 저장된 프로퍼티 스냅샷 가져오기
 */
export function getPropertySnapshot(
  objectId: string,
  ownProperties: boolean = true,
): PropertyDescriptor[] | null {
  return propertySnapshots.get(`${objectId}-${ownProperties}`) || null;
}

// release object
export function objectRelease({ objectId }: { objectId: string }): void {
  const object = objects.get(objectId);
  objects.delete(objectId);
  objectIds.delete(object);
  origins.delete(objectId);
}

export function getObjectById(objectId: string): any {
  return objects.get(objectId);
}
