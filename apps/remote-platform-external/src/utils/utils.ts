import * as CryptoJS from "crypto-js";
import { UAParser } from "ua-parser-js";

import { UserData } from "../modules/webview/webview.gateway";

const ENCRYPTION_KEY = CryptoJS.lib.WordArray.create(
  [1935828585, 1734898793, 1852243968],
  32,
);

const ENCRYPTION_OPTIONS = {
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7,
  iv: CryptoJS.lib.WordArray.create([0, 0, 0, 0, 0, 0, 0, 0], 16),
};

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

const EMPTY_FIELD = { label: "", value: "N/A" };

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
    const decoded = CryptoJS.AES.decrypt(
      userAppData,
      ENCRYPTION_KEY,
      ENCRYPTION_OPTIONS,
    ).toString(CryptoJS.enc.Utf8);

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
        value: `${fields[9] || ""} ${fields[10] || ""} ${fields[11] || ""}`.trim() || "N/A",
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
 * Extracts the spreadsheet ID from a Google Sheets URL.
 * @param url - A Google Sheets URL (e.g. https://docs.google.com/spreadsheets/d/<ID>/edit...)
 * @returns The spreadsheet ID, or null if the URL is invalid.
 */
export function extractGoogleSheetsId(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const regex = /\/d\/([a-zA-Z0-9-_]+)\/edit/;
  const match = url.match(regex);

  return match ? match[1] : null;
}

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
