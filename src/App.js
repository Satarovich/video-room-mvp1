import React, { useEffect, useRef, useState } from "react";
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  selectPeers,
  selectIsConnectedToRoom,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
} from "@100mslive/react-sdk";

// 1) Токены берём из .env
const HOST_TOKEN = process.env.REACT_APP_100MS_HOST_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoyLCJ0eXBlIjoiYXBwIiwiYXBwX2RhdGEiOm51bGwsImFjY2Vzc19rZXkiOiI2ODdmZDFkMmJkMGRhYjVmOWEwMTMxZmYiLCJyb2xlIjoiaG9zdCIsInJvb21faWQiOiI2ODliOWMyYWE1YmE4MzI2ZTZlYjYyZjMiLCJ1c2VyX2lkIjoiYTY3YmMxNDctNGFlNS00NDhmLWI5NmMtZTJjNDdiOWZjZDRkIiwiZXhwIjoxNzU1MTc3MTgyLCJqdGkiOiI2MTQ2NjVkMy0xZTQ5LTQ0YmEtYWQ1My0zYzg5OTUyYjVkNWUiLCJpYXQiOjE3NTUwOTA3ODIsImlzcyI6IjY4N2ZkMWQyYmQwZGFiNWY5YTAxMzFmZCIsIm5iZiI6MTc1NTA5MDc4Miwic3ViIjoiYXBpIn0.mD2gWPa6_OBzawjm1Ay0Y7efzR36toNbqeb5DiHOM90";
const GUEST_TOKEN = process.env.REACT_APP_100MS_GUEST_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoyLCJ0eXBlIjoiYXBwIiwiYXBwX2RhdGEiOm51bGwsImFjY2Vzc19rZXkiOiI2ODdmZDFkMmJkMGRhYjVmOWEwMTMxZmYiLCJyb2xlIjoic3R1ZGVudCIsInJvb21faWQiOiI2ODliOWMyYWE1YmE4MzI2ZTZlYjYyZjMiLCJ1c2VyX2lkIjoiY2MxNWNkMjEtZjI5OS00MmQzLWI0MTktOGRmZDczZGJlZjJkIiwiZXhwIjoxNzU1MTc3MTk0LCJqdGkiOiIxOGJiYzZiMC0yZjlhLTRiNmItYmM1NS1lNGQxYzY3YjE3ZDEiLCJpYXQiOjE3NTUwOTA3OTQsImlzcyI6IjY4N2ZkMWQyYmQwZGFiNWY5YTAxMzFmZCIsIm5iZiI6MTc1NTA5MDc5NCwic3ViIjoiYXBpIn0.Jl4ndD-Da8aIzR6BpfZS7unWAGsepJyrYkHNzsFzbR0";

/** Отрисовка плитки участника и прикрепление его видеотрека к <video> */
function PeerTile({ peer }) {
  const videoRef = useRef(null);
  const hmsActions = useHMSActions();

  useEffect(() => {
    const attach = async () => {
      if (!peer?.videoTrack || !videoRef.current) return;
      try {
        // peer.videoTrack — это ID видеотрека; 100ms сам отдаст MediaStream
        await hmsActions.attachVideo(peer.videoTrack, videoRef.current);
      } catch (e) {
        console.error("Не удалось прикрепить видео:", e);
      }
    };
    const detach = async () => {
      if (!peer?.videoTrack || !videoRef.current) return;
      try {
        await hmsActions.detachVideo(peer.videoTrack, videoRef.current);
      } catch (e) {
        // тихо игнорируем
      }
    };

    attach();
    return () => detach();
  }, [peer?.videoTrack, hmsActions]);

  return (
    <div style={styles.tile}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={peer.isLocal} // себя не эхоим
        style={styles.video}
      />
      <div style={styles.caption}>
        {peer.name || "Гость"} • {peer.roleName}
        {peer.isLocal ? " • Вы" : ""}
      </div>
    </div>
  );
}

/** Сетка из всех участников */
function VideoGrid() {
  const peers = useHMSStore(selectPeers);
  if (!peers.length) {
    return <div style={{ color: "#666" }}>Ожидание участников…</div>;
  }
  return (
    <div style={styles.grid}>
      {peers.map((p) => (
        <PeerTile key={p.id} peer={p} />
      ))}
    </div>
  );
}

/** Верхняя панель: выбор роли + подключение */
function JoinPanel() {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const [role, setRole] = useState("host"); // host | guest

  const join = async () => {
    try {
      const token =
        role === "host"
          ? HOST_TOKEN
          : (GUEST_TOKEN || HOST_TOKEN); // fallback для MVP

      if (!token) {
        alert(
          "Не задан токен. Заполни .env: REACT_APP_100MS_HOST_TOKEN и/или REACT_APP_100MS_GUEST_TOKEN, затем перезапусти npm start."
        );
        return;
      }

      await hmsActions.join({
        userName: role === "host" ? "Преподаватель" : "Ученик",
        authToken: token,
        // Стартуем сразу со включёнными устройствами (браузер всё равно спросит разрешение)
        settings: { isAudioMuted: false, isVideoMuted: false },
      });

      // На всякий: включим после join, если браузер не дал автостарт
      await hmsActions.setLocalVideoEnabled(true);
      await hmsActions.setLocalAudioEnabled(true);
    } catch (err) {
      console.error("Ошибка подключения:", err);
      alert("Не удалось подключиться. Подробности в консоли.");
    }
  };

  if (isConnected) return null;

  return (
    <div style={styles.joinBox}>
      <h1 style={{ margin: 0 }}>Видеоурок</h1>
      <div style={{ marginTop: 12 }}>
        <label style={styles.radio}>
          <input
            type="radio"
            value="host"
            checked={role === "host"}
            onChange={() => setRole("host")}
          />
          Преподаватель
        </label>
        <label style={styles.radio}>
          <input
            type="radio"
            value="guest"
            checked={role === "guest"}
            onChange={() => setRole("guest")}
          />
          Ученик
        </label>
      </div>
      <button style={styles.primaryBtn} onClick={join}>
        Присоединиться
      </button>
    </div>
  );
}

/** Нижняя панель: управление микрофоном/камерой и выход */
function Controls() {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const isCamOn = useHMSStore(selectIsLocalVideoEnabled);
  const isMicOn = useHMSStore(selectIsLocalAudioEnabled);

  if (!isConnected) return null;

  const toggleCam = async () => {
    await hmsActions.setLocalVideoEnabled(!isCamOn);
  };
  const toggleMic = async () => {
    await hmsActions.setLocalAudioEnabled(!isMicOn);
  };
  const leave = async () => {
    await hmsActions.leave();
  };

  return (
    <div style={styles.controls}>
      <button style={styles.ctrlBtn} onClick={toggleMic}>
        {isMicOn ? "Микрофон: выкл" : "Микрофон: вкл"}
      </button>
      <button style={styles.ctrlBtn} onClick={toggleCam}>
        {isCamOn ? "Камера: выкл" : "Камера: вкл"}
      </button>
      <button style={{ ...styles.ctrlBtn, background: "#e53935" }} onClick={leave}>
        Выйти
      </button>
    </div>
  );
}

function RoomUI() {
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  return (
    <div style={styles.wrapper}>
      <JoinPanel />
      {isConnected ? (
        <>
          <VideoGrid />
          <Controls />
        </>
      ) : (
        <div style={{ color: "#777" }}>Подключитесь, чтобы увидеть видео…</div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <HMSRoomProvider>
      <RoomUI />
    </HMSRoomProvider>
  );
}

/** Простые стили inline, чтобы ничего не настраивать отдельно */
const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
    background: "#0e0e12",
    color: "white",
    boxSizing: "border-box",
  },
  joinBox: {
    background: "#17171d",
    border: "1px solid #2b2b33",
    borderRadius: 12,
    padding: 16,
    display: "inline-block",
  },
  radio: { marginRight: 16 },
  primaryBtn: {
    marginTop: 12,
    padding: "10px 16px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12,
    width: "100%",
  },
  tile: {
    position: "relative",
    background: "#111117",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #2b2b33",
    height: 180,
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    background: "#000",
  },
  caption: {
    position: "absolute",
    left: 8,
    bottom: 8,
    padding: "4px 8px",
    background: "rgba(0,0,0,0.55)",
    borderRadius: 6,
    fontSize: 12,
  },
  controls: {
    display: "flex",
    gap: 8,
    marginTop: "auto",
  },
  ctrlBtn: {
    padding: "8px 12px",
    background: "#2b2b33",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};
