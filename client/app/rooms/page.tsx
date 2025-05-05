"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./index.module.css";

const RoomsPage = () => {
  const [rooms, setRooms] = useState<{ id: number; name: string }[]>([]);
  const [selectedTab, setSelectedTab] = useState<"record" | "live">("record");

  useEffect(() => {
    // 선택된 탭에 따라 API 엔드포인트를 변경
    const endpoint =
      selectedTab === "record"
        ? `${process.env.NEXT_PUBLIC_HOST || "http://localhost:3000"}/rooms/record`
        : `${process.env.NEXT_PUBLIC_HOST || "http://localhost:3000"}/rooms`;

    // 해당 탭에 맞는 데이터 가져오기
    void fetch(endpoint)
      .then((response) => response.json())
      .then((data) => {
        setRooms(data);
      })
      .catch(() => {
        console.error("방 목록을 불러오는 중 오류가 발생했습니다.");
        setRooms([]);
      });
  }, [selectedTab]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>방 목록</h1>
      {/* 탭 버튼 */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${selectedTab === "record" ? styles.active : ""}`}
          type="button"
          onClick={() => setSelectedTab("record")}
        >
          녹화 세션
        </button>
        <button
          className={`${styles.tabButton} ${selectedTab === "live" ? styles.active : ""}`}
          type="button"
          onClick={() => setSelectedTab("live")}
        >
          라이브 세션
        </button>
      </div>
      <div className={styles.roomGrid}>
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={convertLink(
              room.name,
              selectedTab === "record" ? room.id : undefined,
            )}
            legacyBehavior
          >
            <a className={styles.roomCard}>
              <h2 className={styles.roomName}>{room.name}</h2>
              <p className={styles.roomDescription}>
                방에 입장하려면 클릭하세요!
              </p>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
};

// URL 생성 함수
const convertLink = (room: string, recordId?: number) => {
  const host = `${process.env.NEXT_PUBLIC_HOST}/rooms/tabbed}`;
  const wsHost = process.env.NEXT_PUBLIC_WS_HOST || "localhost:3000";

  const record = recordId ? `&recordMode=true&recordId=${recordId}` : "";
  const query = `room=${room}${record}`;
  // DevTools frontend에서 protocol을 추가하므로 host만 전달
  const wsUrl = `${wsHost}?${query}`;
  const protocol = process.env.NEXT_PUBLIC_ENV === "development" ? "ws" : "wss";

  return `${host}?${protocol}=${wsUrl}`;
};

export default RoomsPage;
