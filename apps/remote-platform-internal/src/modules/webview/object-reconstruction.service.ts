/* eslint-disable @typescript-eslint/no-explicit-any */

import { Injectable, Logger } from "@nestjs/common";

/**
 * Service responsible for reconstructing JavaScript objects from property snapshots.
 * Used by the "Copy Object" feature during recording session playback.
 */
@Injectable()
export class ObjectReconstructionService {
  private readonly logger = new Logger(ObjectReconstructionService.name);

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Reconstructs an object from property snapshots and returns it as a JSON string.
   * Used by the Copy Object feature during recording session playback.
   */
  public reconstructObjectAsJson(
    objectId: string,
    propertySnapshotsMap: Map<string, any[]>,
    args: any[],
  ): string {
    // Extract indentation option from arguments
    let indent: string | number = 2;
    if (args?.[0]?.value?.indent !== undefined) {
      indent = args[0].value.indent;
    }

    // Return empty object when no snapshot data is available
    const properties = propertySnapshotsMap.get(objectId);
    if (!properties || properties.length === 0) {
      this.logger.debug(
        `No snapshot found for objectId: ${objectId}, returning empty object`,
      );
      return "{}";
    }

    try {
      // Rebuild original object from PropertyDescriptor[] snapshots
      const reconstructed = this.reconstructObjectFromProperties(
        properties,
        propertySnapshotsMap,
        new Set(),
      );
      return JSON.stringify(reconstructed, null, indent);
    } catch (error) {
      this.logger.error(
        `Failed to reconstruct object: ${(error as Error).message}`,
      );
      // Fallback to a simple string representation on circular reference etc.
      return this.propertiesToSimpleString(properties);
    }
  }

  /**
   * Collects property snapshots from Runtime.consoleAPICalled events and
   * indexes them by objectId for later use during object expansion.
   * Supports both the new format (objectId-keyed object) and the legacy format (array).
   */
  public collectPropertySnapshots(
    runtimeProtocols: Array<{ protocol: any }>,
  ): Map<string, any[]> {
    const propertySnapshotsMap = new Map<string, any[]>();

    for (const protocolData of runtimeProtocols) {
      const proto = protocolData.protocol;
      if (
        proto.method !== "Runtime.consoleAPICalled" ||
        !proto.params?._propertySnapshots
      ) {
        continue;
      }

      const snapshots = proto.params._propertySnapshots;

      // New format: objectId-keyed object
      if (typeof snapshots === "object" && !Array.isArray(snapshots)) {
        for (const [objectId, properties] of Object.entries(snapshots)) {
          if (Array.isArray(properties)) {
            propertySnapshotsMap.set(objectId, properties);
          }
        }
      }
      // Legacy format: array of { objectId, properties }
      else if (Array.isArray(snapshots)) {
        for (const snapshot of snapshots) {
          if (snapshot.objectId && Array.isArray(snapshot.properties)) {
            propertySnapshotsMap.set(snapshot.objectId, snapshot.properties);
          }
        }
      }
    }

    this.logger.log(
      `Collected ${propertySnapshotsMap.size} property snapshots for object expansion`,
    );
    return propertySnapshotsMap;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Recursively rebuilds a JavaScript object from an array of PropertyDescriptors.
   */
  private reconstructObjectFromProperties(
    properties: any[],
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const prop of properties) {
      if (prop.name === "__proto__") continue;

      const value = prop.value;
      if (!value) continue;

      result[prop.name] = this.resolvePropertyValue(
        value,
        propertySnapshotsMap,
        visited,
      );
    }

    return result;
  }

  /**
   * Rebuilds an array object from property descriptors (numeric indices only).
   */
  private reconstructArrayFromProperties(
    properties: any[],
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): any[] {
    const result: any[] = [];

    for (const prop of properties) {
      const index = parseInt(prop.name, 10);
      if (isNaN(index) || prop.name === "length" || prop.name === "__proto__")
        continue;

      const value = prop.value;
      if (!value) {
        result[index] = undefined;
        continue;
      }

      result[index] = this.resolvePropertyValue(
        value,
        propertySnapshotsMap,
        visited,
      );
    }

    return result;
  }

  /**
   * Resolves a single RemoteObject value into its JavaScript equivalent.
   * Handles primitives, null, objects, arrays, functions, and symbols.
   */
  private resolvePropertyValue(
    value: any,
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): any {
    if (value.type === "undefined") return undefined;

    if (
      value.type === "string" ||
      value.type === "number" ||
      value.type === "boolean"
    ) {
      return value.value;
    }

    if (value.subtype === "null") return null;

    if (value.type === "object") {
      return this.resolveObjectValue(value, propertySnapshotsMap, visited);
    }

    if (value.type === "function") return "[Function]";
    if (value.type === "symbol") return value.description || "[Symbol]";

    // Fallback for other types
    return value.value ?? value.description ?? null;
  }

  /**
   * Resolves a RemoteObject of type "object" -- either recursing into child
   * properties or falling back to the preview / description.
   */
  private resolveObjectValue(
    value: any,
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): any {
    if (value.objectId && !visited.has(value.objectId)) {
      visited.add(value.objectId);
      const subProperties = propertySnapshotsMap.get(value.objectId);

      if (subProperties && subProperties.length > 0) {
        if (value.subtype === "array" || value.className === "Array") {
          return this.reconstructArrayFromProperties(
            subProperties,
            propertySnapshotsMap,
            visited,
          );
        }
        return this.reconstructObjectFromProperties(
          subProperties,
          propertySnapshotsMap,
          visited,
        );
      }

      // No child snapshot available -- extract from preview
      return this.extractValueFromPreview(value);
    }

    // Already visited or no objectId -- extract from preview
    return this.extractValueFromPreview(value);
  }

  /**
   * Extracts a value from a RemoteObject's preview (or description fallback).
   */
  private extractValueFromPreview(remoteObject: any): any {
    // Primitive value present -- return it directly
    if (remoteObject.value !== undefined) {
      return remoteObject.value;
    }

    // Build from preview properties when available
    if (remoteObject.preview?.properties) {
      const result: any = remoteObject.subtype === "array" ? [] : {};

      for (const prop of remoteObject.preview.properties) {
        if (prop.name === "__proto__") continue;

        let resolved: any;
        if (prop.type === "undefined") {
          resolved = undefined;
        } else if (
          prop.type === "string" ||
          prop.type === "number" ||
          prop.type === "boolean"
        ) {
          resolved = prop.value;
        } else if (prop.subtype === "null") {
          resolved = null;
        } else if (prop.type === "object") {
          // Nested objects use the description
          resolved = prop.value || prop.description || {};
        } else {
          resolved = prop.value ?? prop.description ?? null;
        }

        if (remoteObject.subtype === "array") {
          const index = parseInt(prop.name, 10);
          if (!isNaN(index)) {
            result[index] = resolved;
          }
        } else {
          result[prop.name] = resolved;
        }
      }

      return result;
    }

    // Parse description or return it as-is
    if (remoteObject.description) {
      if (remoteObject.description === "Object") return {};
      if (remoteObject.description.startsWith("Array(")) return [];
      return remoteObject.description;
    }

    return null;
  }

  /**
   * Converts a property array to a simple string representation (fallback).
   */
  private propertiesToSimpleString(properties: any[]): string {
    const result: Record<string, any> = {};

    for (const prop of properties) {
      if (prop.name === "__proto__") continue;

      const value = prop.value;
      if (!value) {
        result[prop.name] = null;
        continue;
      }

      if (value.type === "undefined") {
        result[prop.name] = undefined;
      } else if (
        value.type === "string" ||
        value.type === "number" ||
        value.type === "boolean"
      ) {
        result[prop.name] = value.value;
      } else if (value.subtype === "null") {
        result[prop.name] = null;
      } else if (value.type === "object") {
        result[prop.name] = value.description || "[Object]";
      } else if (value.type === "function") {
        result[prop.name] = "[Function]";
      } else {
        result[prop.name] = value.value ?? value.description ?? null;
      }
    }

    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return "{}";
    }
  }
}
