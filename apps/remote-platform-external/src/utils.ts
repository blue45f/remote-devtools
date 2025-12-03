import * as CryptoJS from "crypto-js";

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

export const stringifyUserAppData = (userAppData: string): string => {
  const decoded = decryptUserAppData(userAppData);

  return Object.values(decoded)
    .map(({ label, value }) => `${label} : ${value}`)
    .join("\n");
};

// decryptUserBaedal 함수로 복호화된 데이터를 같은 방식으로 암호화
export const encryptUserBaedal = (v: string): string => {
  return CryptoJS.AES.encrypt(v, key, pref).toString();
};

export const convertRecordLink = (
  room: string,
  recordId: number | null,
): string => {
  const host =
    process.env.APP_ENV !== "beta"
      ? `http://localhost:3000`
      : process.env.INTERNAL_HOST || "http://localhost:3000";
  const record = recordId ? `&recordMode=true&recordId=${recordId}` : "";
  const wsHost = host?.replace(/^https?:\/\/(.+)$/, "$1");
  const protocol = host.startsWith("https") ? "wss" : "ws";
  // DevTools frontend에서 protocol을 추가하므로 host만 전달
  const wsUrl = encodeURIComponent(`${wsHost}?room=${room}${record}`);
  return `${host}/tabbed-debug/?${protocol}=${wsUrl}`;
};
