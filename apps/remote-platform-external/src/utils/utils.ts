import { createDecipheriv } from "node:crypto";

import { UAParser } from "ua-parser-js";

import type { UserData } from "../modules/webview/webview.gateway";

// AES-256-CBC key/IV (byte-identical to the original CryptoJS WordArray)
const ENCRYPTION_KEY = Buffer.from(
  "73626669676874696e6700000000000000000000000000000000000000000000",
  "hex",
);
const ENCRYPTION_IV = Buffer.alloc(16, 0);

/** Decrypted user app information with labeled fields. */
interface UserAppInfo {
  readonly appVersion: { readonly label: string; readonly value: string };
  readonly osVersion: { readonly label: string; readonly value: string };
  readonly platform: { readonly label: string; readonly value: string };
  readonly latitude: { readonly label: string; readonly value: string };
  readonly longitude: { readonly label: string; readonly value: string };
  readonly deviceId: { readonly label: string; readonly value: string };
  readonly memberNo: { readonly label: string; readonly value: string };
  readonly address: { readonly label: string; readonly value: string };
}

const EMPTY_USER_APP_INFO: UserAppInfo = {
  appVersion: { label: "App Version", value: "N/A" },
  osVersion: { label: "OS Version", value: "N/A" },
  platform: { label: "Platform", value: "N/A" },
  latitude: { label: "Latitude", value: "N/A" },
  longitude: { label: "Longitude", value: "N/A" },
  deviceId: { label: "Device ID", value: "N/A" },
  memberNo: { label: "Member No", value: "N/A" },
  address: { label: "Address", value: "N/A" },
};

/**
 * Decrypts the encrypted user app data string into structured user information.
 * Returns default "N/A" values when userAppData is missing or decryption fails.
 */
export const decryptUserAppData = (userAppData: string): UserAppInfo => {
  if (!userAppData) {
    return EMPTY_USER_APP_INFO;
  }

  try {
    const encrypted = Buffer.from(userAppData, "base64");
    const decipher = createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, ENCRYPTION_IV);
    const decoded = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");

    if (!decoded) {
      return EMPTY_USER_APP_INFO;
    }

    const fields = decoded.split("|");
    return {
      appVersion: { label: "App Version", value: fields[0] || "N/A" },
      osVersion: { label: "OS Version", value: fields[1] || "N/A" },
      platform: { label: "Platform", value: fields[2] || "N/A" },
      latitude: { label: "Latitude", value: fields[4] || "N/A" },
      longitude: { label: "Longitude", value: fields[5] || "N/A" },
      deviceId: { label: "Device ID", value: fields[6] || "N/A" },
      memberNo: { label: "Member No", value: fields[7] || "N/A" },
      address: {
        label: "Address",
        value:
          `${fields[9] || ""} ${fields[10] || ""} ${fields[11] || ""}`.trim() ||
          "N/A",
      },
    };
  } catch {
    return EMPTY_USER_APP_INFO;
  }
};

/**
 * Builds a DevTools frontend URL for the given room and optional record.
 * The DevTools frontend adds the protocol prefix, so only the host is passed in the WS URL.
 */
export const convertRecordLink = (
  room: string,
  recordId: number | null,
): string => {
  const host =
    process.env.APP_ENV !== "beta"
      ? `http://localhost:${process.env.PORT}`
      : process.env.INTERNAL_HOST || "http://localhost:3000";
  const record = recordId ? `&recordMode=true&recordId=${recordId}` : "";
  const wsHost = host?.replace(/^https?:\/\/(.+)$/, "$1");
  const wsUrl = encodeURIComponent(`${wsHost}?room=${room}${record}`);
  const protocol = host.startsWith("https") ? "wss" : "ws";
  return `${host}/tabbed-debug/?${protocol}=${wsUrl}`;
};

/**
 * Parses a User-Agent string to extract OS and browser information.
 * @param userAgentString - The raw User-Agent header value.
 * @returns An object with formatted OS and browser strings (e.g. "iOS / 14.8.1").
 */
export function parseUserAgent(userAgentString: string): {
  readonly os: string;
  readonly browser: string;
} {
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  let formattedOs = "Unknown";
  if (result.os.name) {
    formattedOs = result.os.version
      ? `${result.os.name} / ${result.os.version}`
      : result.os.name;
  }

  let formattedBrowser = "Unknown";
  if (result.browser.name) {
    formattedBrowser = result.browser.version
      ? `${result.browser.name} / ${result.browser.version}`
      : result.browser.name;
  }

  return { os: formattedOs, browser: formattedBrowser };
}

/**
 * Builds a human-readable text summary of user/device data for use in
 * Jira tickets, Slack messages, etc.
 */
export const createUserDataText = (userData: UserData): string => {
  const { commonInfo, userAgent, URL, webTitle } = userData;
  const userAppData =
    commonInfo?.user?.userAppData || commonInfo?.user?.userBaedal;
  const {
    appVersion,
    platform,
    deviceId,
    memberNo,
    latitude,
    longitude,
    address,
  } = decryptUserAppData(userAppData);
  const { os, browser } = parseUserAgent(userAgent);

  const appVersionDisplay = appVersion.value?.includes("_")
    ? appVersion.value.split("_")[1]
    : appVersion.value;

  return [
    `Server: ${process.env.APP_ENV || "development"}`,
    `URL: ${webTitle ? `[${webTitle}] ` : ""}${decodeURIComponent(URL || "")}`,
    `App Version: ${appVersionDisplay}`,
    `Device Model: ${platform.value}`,
    `OS: ${os}`,
    `Browser: ${browser}`,
    `Device ID: ${deviceId.value}`,
    `Member No: ${memberNo.value}`,
    `Latitude: ${latitude.value}`,
    `Longitude: ${longitude.value}`,
    `App Address: ${address.value}`,
  ].join("\n");
};
