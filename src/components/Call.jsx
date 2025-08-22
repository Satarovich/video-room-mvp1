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

  // первый удалённый участник (кроме меня)
  const remotePeer = useMemo(
    () => peers.find(p => p.id && p.id !== localPeer?.id) || null,
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
      // включим устройства сразу после входа
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

  // --- экран до подключения ---
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

  // --- после подключения: только две плитки (я и первый удалённый) ---
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#666' }}>
          Статус: подключено · Участников: {peers.length}
        </span>
        <button onClick={toggleMic}>{isMicOn ? 'Выключить микрофон' : 'Включить микрофон'}</button>
        <button onClick={toggleCam}>{isCamOn ? 'Выключить камеру' : 'Включить камеру'}</button>
        <button onClick={leave}>Выйти</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))', gap: 12 }}>
        <PeerVideoTile peerId={localPeer?.id} name={localPeer?.name || 'Вы'} isLocal />
        <PeerVideoTile peerId={remotePeer?.id} name={remotePeer?.name} />
      </div>

      {!remotePeer && (
        <div style={{ fontSize: 13, color: '#666' }}>
          Ожидаем второго участника…
        </div>
      )}
    </div>
  );
}

/** Плитка видео через attach/detach:
 *  - Хуки вызываются всегда (правило React), но внутри эффекта стоят проверки.
 *  - Плитка показывается ТОЛЬКО если есть ВКЛЮЧЁННЫЙ видеотрек.
 *  - Никаких «чёрных квадратов»: если камера выключена/человек вышел — компонент возвращает null.
 */
function PeerVideoTile({ peerId, name, isLocal }) {
  const actions = useHMSActions();
  const videoRef = useRef(null);
  const videoTrack = useHMSStore(selectCameraStreamByPeerID(peerId));

  // всегда вызываем эффект, но выходим, если трека нет
  useEffect(() => {
    const el = videoRef.current;
    const id = videoTrack?.id || videoTrack?.trackId;
    if (!el || !id) return;

    if (videoTrack.enabled) {
      actions.attachVideo(id, el);
    } else {
      // если трек выключили — аккуратно отцепим
      try { actions.detachVideo(id, el); } catch {}
    }

    return () => {
      try { actions.detachVideo(id, el); } catch {}
    };
  }, [actions, videoTrack?.id, videoTrack?.trackId, videoTrack?.enabled]);

  // если нет включённого видеотрека — ничего не рендерим
  if (!peerId || !videoTrack?.id || !videoTrack.enabled) return null;

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
      <div style={{ background: '#f6f6f6', padding: '6px 10px', fontSize: 14 }}>
        {name || 'Участник'}
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!!isLocal}
        style={{ width: '100%', aspectRatio: '16 / 9', background: '#000' }}
      />
    </div>
  );
}
