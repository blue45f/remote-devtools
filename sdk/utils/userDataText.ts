import * as CryptoJS from "crypto-js";
import { UAParser } from "ua-parser-js";

import { CommonInfo } from "../types/common";

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
interface UserBaedalInfo {
  appVersion: { label: string; value: string };
  osVersion: { label: string; value: string };
  platform: { label: string; value: string };
  latitude: { label: string; value: string };
  longitude: { label: string; value: string };
  deviceId: { label: string; value: string };
  memberNo: { label: string; value: string };
  address: { label: string; value: string };
}

const decryptUserBaedal = (userBaedal: string): UserBaedalInfo => {
  const decoded = CryptoJS.AES.decrypt(userBaedal, key, pref).toString(
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

/**
 * User-Agent 문자열을 파싱하여 OS, OS 버전, 브라우저, 브라우저 버전을 추출하는 함수.
 *
 * @param {string} userAgentString - 파싱할 User-Agent 문자열.
 * @returns {{os: string, browser: string}}
 * 추출된 정보를 담은 간결한 객체.
 * 예: { os: 'iOS / 14.8.1', browser: 'Safari / 14.1.2' }
 */
function parseUserAgent(userAgentString: string): {
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

export type UserData = {
  commonInfo: CommonInfo | null;
  userAgent: string;
  URL: string;
  webTitle: string;
};

export const createUserDataText = (userData: UserData): string => {
  const { commonInfo, userAgent, URL, webTitle } = userData;

  // commonInfo가 없거나 userBaedal이 없으면 기본 정보만 반환
  if (!commonInfo || !commonInfo.user?.userBaedal) {
    const { os, browser } = parseUserAgent(userAgent);
    return `서버: Beta \nURL: ${webTitle ? `[${webTitle}] ` : ""}${URL} \nOS: ${os} \n브라우저: ${browser}`;
  }

  const {
    appVersion,
    platform,
    deviceId,
    memberNo,
    latitude,
    longitude,
    address,
  } = decryptUserBaedal(commonInfo.user.userBaedal);
  const { os, browser } = parseUserAgent(userAgent);

  return `서버: Beta \nURL: ${webTitle ? `[${webTitle}] ` : ""}${decodeURIComponent(URL)} \n앱 버전: ${appVersion.value.split("_")[1]} \n디바이스 모델: ${platform.value} \nOS: ${os} \n브라우저: ${browser} \n디바이스 ID: ${deviceId.value} \n멤버 번호: ${memberNo.value} \n위도: ${latitude.value} \n경도: ${longitude.value} \n앱 설정 주소: ${address.value}`;
};
