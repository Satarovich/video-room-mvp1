// src/components/Call.jsx
import React, { useMemo, useState } from 'react';
import {
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
  selectPeers,
  selectLocalPeer,
  selectCameraStreamByPeerID,
  useVideo
} from '@100mslive/react-sdk';
import { getToken } from '../api';

export default function Call({ role }) {
  const actions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Берём первого удалённого участника (кроме себя)
  const remotePeer = useMemo(
    () => peers.find(p => p.id !== localPeer?.id) || null,
    [peers, localPeer]
  );

  const join = async () => {
    const r = role || 'guest';
    setLoading(true);
    setErr('');
    try {
      const userName = r === 'host' ? 'Teacher' : 'Student';
      const token = await getToken(r, `${userName}-${Math.floor(Math.random() * 10000)}`);
      await actions.join({ authToken: token, userName });
      // Включаем устройства сразу после входа
      await actions.setLocalAudioEnabled(true);
      await actions.setLocalVideoEnabled(true);
    } catch (e) {
      setErr(e?.message || 'Не удалось подключиться');
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = async () => {
    const on = await actions.getLocalAudioEnabled();
    await actions.setLocalAudioEnabled(!on);
  };
  const toggleCam = async () => {
    const on = await actions.getLocalVideoEnabled();
    await actions.setLocalVideoEnabled(!on);
  };
  const leave = async () => { try { await actions.leave(); } catch {} };

  // До подключения — только кнопка и сообщение об ошибке
  if (!isConnected) {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 13, color: '#666' }}>Статус: не подключено</div>
        <button onClick={join} disabled={loading} style={{ padding: '10px 16px' }}>
          {loading ? 'Подключаюсь…' : role === 'host' ? 'Зайти как преподаватель' : 'Присоединиться как ученик'}
        </button>
        {err && <div style={{ color: 'crimson' }}>Ошибка: {err}</div>}
      </div>
    );
  }

  // Подключено — показываем две плитки: я и первый удалённый (только если их камеры включены)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#666' }}>
          Статус: подключено · Участников: {peers.length}
        </span>
        <button onClick={toggleMic}>Микрофон вкл/выкл</button>
        <button onClick={toggleCam}>Камера вкл/выкл</button>
        <button onClick={leave}>Выйти</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))', gap: 12 }}>
        <VideoTile peerId={localPeer?.id} name={localPeer?.name || 'Вы'} isLocal />
        <VideoTile peerId={remotePeer?.id} name={remotePeer?.name} />
      </div>

      {!remotePeer && (
        <div style={{ fontSize: 13, color: '#666' }}>
          Ожидаем второго участника…
        </div>
      )}
    </div>
  );
}

/**
 * Универсальная плитка видео.
 * - Использует хук useVideo(trackId) — он сам корректно монтирует/демонтирует поток.
 * - Если видеотрек отсутствует или выключен — плитка не рендерится (никаких чёрных квадратов).
 */
function VideoTile({ peerId, name, isLocal }) {
  const videoTrack = useHMSStore(selectCameraStreamByPeerID(peerId));
  const trackId = videoTrack?.id || videoTrack?.trackId || undefined;
  const ref = useVideo(trackId);

  // Скрываем плитку, если нет включённого видеотрека
  if (!peerId || !videoTrack || !videoTrack.enabled) return null;

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
      <div style={{ background: '#f6f6f6', padding: '6px 10px', fontSize: 14 }}>
        {name || 'Участник'}
      </div>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={!!isLocal}
        style={{ width: '100%,', aspectRatio: '16 / 9', background: '#000' }}
      />
    </div>
  );
}
