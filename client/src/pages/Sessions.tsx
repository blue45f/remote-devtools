import { useEffect, useState } from "react";
import styles from "./Sessions.module.css";

const SessionsPage = () => {
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [selectedTab, setSelectedTab] = useState<"record" | "live">("record");

  useEffect(() => {
    const endpoint =
      selectedTab === "record"
        ? `${import.meta.env.VITE_HOST || "http://localhost:3000"}/sessions/record`
        : `${import.meta.env.VITE_HOST || "http://localhost:3000"}/sessions`;

    void fetch(endpoint)
      .then((response) => response.json())
      .then((data) => {
        setSessions(data);
      })
      .catch(() => {
        console.error("Failed to load session list.");
        setSessions([]);
      });
  }, [selectedTab]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Sessions</h1>
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
      <div className={styles.sessionGrid}>
        {sessions.map((session) => (
          <a
            key={session.id}
            href={convertLink(
              session.name,
              selectedTab === "record" ? session.id : undefined,
            )}
            className={styles.sessionCard}
          >
            <h2 className={styles.sessionName}>{session.name}</h2>
            <p className={styles.sessionDescription}>
              Click to enter the session
            </p>
          </a>
        ))}
      </div>
    </div>
  );
};

const convertLink = (room: string, recordId?: number) => {
  const host = import.meta.env.VITE_HOST || "http://localhost:3000";
  const wsHost = host.replace(/^https?:\/\/(.+)$/, "$1");

  const record = recordId ? `&recordMode=true&recordId=${recordId}` : "";
  const wsUrl = encodeURIComponent(`${wsHost}?room=${room}${record}`);
  const protocol = host.startsWith("https") ? "wss" : "ws";

  return `${host}/tabbed-debug/?${protocol}=${wsUrl}`;
};

export default SessionsPage;
