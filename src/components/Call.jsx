// src/components/Call.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
  selectPeers,
  selectLocalPeer,
  selectCameraStreamByPeerID,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
} from '@100mslive/react-sdk';
import { getToken } from '../api';

export default function Call({ role }) {
  const actions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);

  const isMicOn = useHMSStore(selectIsLocalAudioEnabled);
  const isCamOn = useHMSStore(selectIsLocalVideoEnabled);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Берём первого удалённого участника (кроме себя)
  const remotePeer = useMemo(() => peers.find(p => p.id !== localPeer?.id) || null, [peers, localPeer]);

  const join = async () => {
    const r = role || 'guest';
    setLoading(true);
    setErr('');
    try {
      const userName = r === 'host' ? 'Teacher' : 'Student';
      const token = await getToken(r, `${userName}-${Math.floor(Math.random() * 10000)}`);
      await actions.join({ authToken: token, userName });
      // включим локальные устройства сразу после входа
      await actions.setLocalAudioEnabled(true);
      await actions.setLocalVideoEnabled(true);
    } catch (e) {
      setErr(e?.message || 'Не удалось подключиться');
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = async () => { try { await actions.setLocalAudioEnabled(!isMicOn); } catch {} };
  const toggleCam = async () => { try { await actions.setLocalVideoEnabled(!isCamOn); } catch {} };
  const leave     = async () => { try { await actions.leave(); } catch {} };

  // --- Экран до подключения ---
  if (!isConnected) {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 13, color: '#666' }}>
          Статус: не подключено
        </div>
        <button onClick={join} disabled={loading} style={{ padding: '10px 16px' }}>
          {loading ? 'Подключаюсь…' : role === 'host' ? 'Зайти как преподаватель' : 'Присоединиться как ученик'}
        </button>
        {err && <div style={{ color: 'crimson' }}>Ошибка: {err}</div>}
      </div>
    );
  }

  // --- Экран после подключения: только два «окна» (я и один удалённый) ---
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Статус и управление */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#666' }}>
          Статус: подключено · Участников: {peers.length}
        </span>
        <button onClick={toggleMic}>{isMicOn ? 'Выключить микрофон' : 'Включить микрофон'}</button>
        <button onClick={toggleCam}>{isCamOn ? 'Выключить камеру' : 'Включить камеру'}</button>
        <button onClick={leave}>Выйти</button>
      </div>

      {/* Ровно две плитки: локальная и первая удалённая.
          Плитка показывается ТОЛЬКО если камера включена.
          Если участник вышел/выключил камеру — плитка автоматически исчезает. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))',
          gap: 12,
          alignItems: 'stretch'
        }}
      >
        <PeerVideoTile peerId={localPeer?.id} name={(localPeer?.name || 'Вы')} />
        <PeerVideoTile peerId={remotePeer?.id} name={remotePeer?.name} />
      </div>

      {/* Подсказка, если удалённого пока нет */}
      {!remotePeer && (
        <div style={{ fontSize: 13, color: '#666' }}>
          Ожидаем второго участника…
        </div>
      )}
    </div>
  );
}

/** Плитка видео:
 *  - Показывается только если есть ВКЛЮЧЁННЫЙ видеотрек.
 *  - Никаких чёрных заглушек: если камера выключена — плитки нет.
 */
function PeerVideoTile({ peerId, name }) {
  const actions = useHMSActions();
  const videoRef = useRef(null);
  const videoTrack = useHMSStore(selectCameraStreamByPeerID(peerId));

  // скрываем плитку, если нет включённого видеотрека
  if (!peerId || !videoTrack || !videoTrack.enabled) return null;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoTrack) return;
    actions.attachVideo(videoTrack.id, el);
    return () => {
      try { actions.detachVideo(videoTrack.id, el); } catch {}
    };
  }, [videoTrack, actions]);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
      <div style={{ background: '#f6f6f6', padding: '6px 10px', fontSize: 14 }}>
        {name || 'Участник'}
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        style={{ width: '100%', aspectRatio: '16 / 9', background: '#000' }}
      />
    </div>
  );
}
