import React, { useEffect, useRef, useState } from 'react';
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

/**
 * Компонент комнаты 100ms.
 * - Если передан prop `role` ("guest" | "host"), покажет одну кнопку входа для этой роли.
 * - Если prop не передан — покажет две кнопки: Host и Guest.
 */
export default function Call({ role }) {
  const actions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);

  const isMicOn = useHMSStore(selectIsLocalAudioEnabled);
  const isCamOn = useHMSStore(selectIsLocalVideoEnabled);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const joinWithRole = async (r) => {
    const chosenRole = r || role || 'guest';
    setLoading(true);
    setErr('');
    try {
      const userName = chosenRole === 'host' ? 'Teacher' : 'Student';
      const token = await getToken(chosenRole, `${userName}-${Math.floor(Math.random() * 10000)}`);
      await actions.join({ authToken: token, userName });
    } catch (e) {
      console.error('join error', e);
      setErr(e?.message || 'Не удалось получить/использовать токен');
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = async () => {
    try { await actions.setLocalAudioEnabled(!isMicOn); } catch (e) { console.error(e); }
  };
  const toggleCam = async () => {
    try { await actions.setLocalVideoEnabled(!isCamOn); } catch (e) { console.error(e); }
  };
  const leave = async () => {
    try { await actions.leave(); } catch (e) { console.error(e); }
  };

  if (!isConnected) {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {role ? (
          <button onClick={() => joinWithRole(role)} disabled={loading} style={{ padding: '10px 16px' }}>
            {loading ? 'Подключаюсь…' : role === 'host' ? 'Зайти как преподаватель' : 'Присоединиться как ученик'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => joinWithRole('host')} disabled={loading}>Join as Host</button>
            <button onClick={() => joinWithRole('guest')} disabled={loading}>Join as Guest</button>
          </div>
        )}
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

      {/* Сетка участников */}
      <PeersGrid peers={peers} localId={localPeer?.id} />
    </div>
  );
}

/* ===== Вспомогательные компоненты ===== */

function PeersGrid({ peers, localId }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
      {peers.map(p => (
        <PeerTile key={p.id} peerId={p.id} name={p.name} isLocal={p.id === localId} />
      ))}
    </div>
  );
}

function PeerTile({ peerId, name, isLocal }) {
  const actions = useHMSActions();
  const videoRef = useRef(null);
  const videoTrack = useHMSStore(selectCameraStreamByPeerID(peerId));

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
    <div style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: '#f6f6f6', padding: '6px 10px', fontSize: 14 }}>
        {name} {isLocal ? '(вы)' : ''}
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{ width: '100%', aspectRatio: '16 / 9', background: '#000' }}
      />
    </div>
  );
}
