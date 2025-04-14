import * as CryptoJS from "crypto-js";
import { UAParser } from "ua-parser-js";

import { UserData } from "../modules/webview/webview.gateway";

const key = CryptoJS.lib.WordArray.create(
  [1935828585, 1734898793, 1852243968],
  32,
);

const pref = {
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7,
  iv: CryptoJS.lib.WordArray.create([0, 0, 0, 0, 0, 0, 0, 0], 16),
};

// 사용자 정보 타입 정의
interface UserAppInfo {
  appVersion: { label: string; value: string };
  osVersion: { label: string; value: string };
  platform: { label: string; value: string };
  latitude: { label: string; value: string };
  longitude: { label: string; value: string };
  deviceId: { label: string; value: string };
  memberNo: { label: string; value: string };
  address: { label: string; value: string };
}

export const decryptUserAppData = (userAppData: string): UserAppInfo => {
  const decoded = CryptoJS.AES.decrypt(userAppData, key, pref).toString(
    CryptoJS.enc.Utf8,
  );

  const splittedValue = decoded.split("|");
  return {
    appVersion: {
      label: "앱 버전",
      value: splittedValue[0],
    },
    osVersion: {
      label: "OS 버전",
      value: splittedValue[1],
    },
    platform: {
      label: "플랫폼",
      value: splittedValue[2],
    },
    latitude: {
      label: "위도",
      value: splittedValue[4],
    },
    longitude: {
      label: "경도",
      value: splittedValue[5],
    },
    deviceId: {
      label: "디바이스 ID",
      value: splittedValue[6],
    },
    memberNo: {
      label: "멤버 번호",
      value: splittedValue[7],
    },
    address: {
      label: "주소",
      value: `${splittedValue[9]} ${splittedValue[10]} ${splittedValue[11]}`,
    },
  };
};

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
  // DevTools frontend에서 protocol을 추가하므로 host만 전달
  const wsUrl = encodeURIComponent(`${wsHost}?room=${room}${record}`);
  const protocol = host.startsWith("https") ? "wss" : "ws";
  return `${host}/tabbed-debug/?${protocol}=${wsUrl}`;
};

/**
 * Google Sheets URL에서 스프레드시트 ID를 추출합니다.
 * @param url Google Sheets URL (예: https://docs.google.com/spreadsheets/d/1od4w5nQMgsOyl6ZKL31dgn2JxcdOBVve3K6coaEt71Y/edit?gid=634974048#gid=634974048)
 * @returns 스프레드시트 ID 또는 null (URL이 유효하지 않은 경우)
 */
export function extractGoogleSheetsId(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  // Google Sheets URL 패턴: /d/[스프레드시트ID]/edit
  const regex = /\/d\/([a-zA-Z0-9-_]+)\/edit/;
  const match = url.match(regex);

  return match ? match[1] : null;
}

/**
 * User-Agent 문자열을 파싱하여 OS, OS 버전, 브라우저, 브라우저 버전을 추출하는 함수.
 *
 * @param {string} userAgentString - 파싱할 User-Agent 문자열.
 * @returns {{os: string, browser: string}}
 * 추출된 정보를 담은 간결한 객체.
 * 예: { os: 'iOS / 14.8.1', browser: 'Safari / 14.1.2' }
 */
export function parseUserAgent(userAgentString: string): {
  os: string;
  browser: string;
} {
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  // OS 정보 포맷팅
  let formattedOs = "Unknown";
  if (result.os.name) {
    formattedOs = result.os.version
      ? `${result.os.name} / ${result.os.version}`
      : result.os.name;
  }

  // 브라우저 정보 포맷팅
  let formattedBrowser = "Unknown";
  if (result.browser.name) {
    formattedBrowser = result.browser.version
      ? `${result.browser.name} / ${result.browser.version}`
      : result.browser.name;
  }

  return {
    os: formattedOs,
    browser: formattedBrowser,
  };
}

export const createUserDataText = (userData: UserData) => {
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

  return `서버: ${process.env.APP_ENV || "development"} \nURL: ${webTitle ? `[${webTitle}] ` : ""}${decodeURIComponent(URL)} \n앱 버전: ${appVersion.value.split("_")[1]} \n디바이스 모델: ${platform.value} \nOS: ${os} \n브라우저: ${browser} \n디바이스 ID: ${deviceId.value} \n멤버 번호: ${memberNo.value} \n위도: ${latitude.value} \n경도: ${longitude.value} \n앱 설정 주소: ${address.value}`;
};
