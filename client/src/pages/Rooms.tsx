import { useEffect, useState } from "react";
import styles from "./Rooms.module.css";

const RoomsPage = () => {
  const [rooms, setRooms] = useState<{ id: number; name: string }[]>([]);
  const [selectedTab, setSelectedTab] = useState<"record" | "live">("record");

  useEffect(() => {
    const endpoint =
      selectedTab === "record"
        ? `${import.meta.env.VITE_HOST || "http://localhost:3000"}/rooms/record`
        : `${import.meta.env.VITE_HOST || "http://localhost:3000"}/rooms`;

    void fetch(endpoint)
      .then((response) => response.json())
      .then((data) => {
        setRooms(data);
      })
      .catch(() => {
        console.error("Failed to load room list.");
        setRooms([]);
      });
  }, [selectedTab]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Rooms</h1>
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${selectedTab === "record" ? styles.active : ""}`}
          type="button"
          onClick={() => setSelectedTab("record")}
        >
          Record Sessions
        </button>
        <button
          className={`${styles.tabButton} ${selectedTab === "live" ? styles.active : ""}`}
          type="button"
          onClick={() => setSelectedTab("live")}
        >
          Live Sessions
        </button>
      </div>
      <div className={styles.roomGrid}>
        {rooms.map((room) => (
          <a
            key={room.id}
            href={convertLink(
              room.name,
              selectedTab === "record" ? room.id : undefined,
            )}
            className={styles.roomCard}
          >
            <h2 className={styles.roomName}>{room.name}</h2>
            <p className={styles.roomDescription}>
              Click to enter the room
            </p>
          </a>
        ))}
      </div>
    </div>
  );
};

const convertLink = (room: string, recordId?: number) => {
  const host = `${import.meta.env.VITE_HOST || "http://localhost:3000"}/rooms/tabbed`;
  const wsHost = import.meta.env.VITE_WS_HOST || "localhost:3000";

  const record = recordId ? `&recordMode=true&recordId=${recordId}` : "";
  const query = `room=${room}${record}`;
  const wsUrl = `${wsHost}?${query}`;
  const protocol = import.meta.env.VITE_ENV === "development" ? "ws" : "wss";

  return `${host}?${protocol}=${wsUrl}`;
};

export default RoomsPage;
