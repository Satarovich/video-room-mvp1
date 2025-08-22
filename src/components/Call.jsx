// src/components/Call.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
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

  // Находим "первого удалённого" участника (кроме себя)
  const remotePeer = useMemo(() => {
    return peers.find(p => p.id !== localPeer?.id);
  }, [peers, localPeer]);

  const join = async () => {
    const r = role || 'guest';
    setLoading(true);
    setErr('');
    try {
      const userName = r === 'host' ? 'Teacher' : 'Student';
      const token = await getToken(r, `${userName}-${Math.floor(Math.random() * 10000)}`);
      await actions.join({ authToken: token, userName });
      // Включаем камеру/мик сразу, чтобы было видно
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

  if (!isConnected) {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <button onClick={join} disabled={loading} style={{ padding: '10px 16px' }}>
          {loading ? 'Подключаюсь…' : role === 'host' ? 'Зайти как преподаватель' : 'Присоединиться как ученик'}
        </button>
        {err && <div style={{ color: 'crimson' }}>Ошибка: {err}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Панель управления */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={toggleMic}>{isMicOn ? 'Выключить микрофон' : 'Включить микрофон'}</button>
        <button onClick={toggleCam}>{isCamOn ? 'Выключить камеру' : 'Включить камеру'}</button>
        <button onClick={leave}>Выйти</button>
      </div>

      {/* Ровно две плитки: Я и Один удалённый (если есть и камера включена) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))',
          gap: 12,
          alignItems: 'stretch'
        }}
      >
        <PeerVideoTile peerId={localPeer?.id} name={(localPeer?.name || 'Вы')} hideIfNoVideo />
        <PeerVideoTile peerId={remotePeer?.id} name={remotePeer?.name} hideIfNoVideo />
      </div>
    </div>
  );
}

/**
 * Плитка видео: показывает только если есть ВКЛЮЧЁННЫЙ видеотрек.
 * Если участник выключил камеру или вышел — плитка пропадает (никаких чёрных квадратов).
 */
function PeerVideoTile({ peerId, name, hideIfNoVideo }) {
  const actions = useHMSActions();
  // selector подхватывает текущий видеопоток участника
  const videoTrack = useHMSStore(selectCameraStreamByPeerID(peerId));
  const videoRef = useRef(null);

  // Если нужно скрывать при отсутствии видео — скрываем
  if (hideIfNoVideo && (!peerId || !videoTrack || !videoTrack.enabled)) {
    return null;
  }

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoTrack) return;
    if (videoTrack.enabled) {
      actions.attachVideo(videoTrack.id, el);
    } else {
      actions.detachVideo(videoTrack.id, el);
    }
    return () => {
      try { actions.detachVideo(videoTrack.id, el); } catch {}
    };
  }, [videoTrack, actions]);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
      <div style={{ background: '#f6f6f6', padding: '6px 10px', fontSize: 14 }}>
        {name || 'Участник'}
      </div>
      {/* Если поток есть и включён — видео; иначе — ничего (плитка скрывается на уровне return null) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false /* локальную дорожку мы мьютим в SDK, здесь можно не трогать */}
        style={{ width: '100%', aspectRatio: '16 / 9', background: '#000' }}
      />
    </div>
  );
}
