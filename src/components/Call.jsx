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
  const [diag, setDiag] = useState([]);

  const log = (...a) => {
    console.log('[CALL]', ...a);
    setDiag(d => [...d, a.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')].slice(-10));
  };

  // первый удалённый участник (кроме меня)
  const remotePeer = useMemo(
    () => peers.find(p => p.id !== localPeer?.id) || null,
    [peers, localPeer]
  );

  const join = async () => {
    const r = role || 'guest';
    setLoading(true);
    setErr('');
    try {
      log('join.start', { r });
      const userName = r === 'host' ? 'Teacher' : 'Student';
      const token = await getToken(r, `${userName}-${Math.floor(Math.random() * 10000)}`);
      log('token.ok', { len: token?.length, head: token?.slice(0, 20) });
      await actions.join({ authToken: token, userName });
      log('actions.join.sent', { userName });
      await actions.setLocalAudioEnabled(true);
      await actions.setLocalVideoEnabled(true);
      log('devices.enabled');
    } catch (e) {
      console.error(e);
      setErr(e?.message || 'Не удалось подключиться');
      log('join.error', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { log('state', { isConnected, peers: peers.length }); }, [isConnected, peers.length]);

  const toggleMic = async () => { try { await actions.setLocalAudioEnabled(!isMicOn); } catch (e) { log('mic.err', e?.message); } };
  const toggleCam = async () => { try { await actions.setLocalVideoEnabled(!isCamOn); } catch (e) { log('cam.err', e?.message); } };
  const leave     = async () => { try { await actions.leave(); log('left'); } catch (e) { log('leave.err', e?.message); } };

  // --- до подключения ---
  if (!isConnected) {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 13, color: '#666' }}>Статус: не подключено</div>
        <button onClick={join} disabled={loading} style={{ padding: '10px 16px' }}>
          {loading ? 'Подключаюсь…' : role === 'host' ? 'Зайти как преподаватель' : 'Присоединиться как ученик'}
        </button>
        {err && <div style={{ color: 'crimson' }}>Ошибка: {err}</div>}
        <DiagPanel diag={diag} />
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
        <PeerVideoTile peerId={localPeer?.id} name={localPeer?.name || 'Вы'} />
        <PeerVideoTile peerId={remotePeer?.id} name={remotePeer?.name} />
      </div>

      {!remotePeer && <div style={{ fontSize: 13, color: '#666' }}>Ожидаем второго участника…</div>}
      <DiagPanel diag={diag} />
    </div>
  );
}

function PeerVideoTile({ peerId, name }) {
  const actions = useHMSActions();
  const videoRef = useRef(null);
  const videoTrack = useHMSStore(selectCameraStreamByPeerID(peerId));

  // показываем плитку только если есть включённый видеотрек
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
      <video ref={videoRef} autoPlay playsInline muted={false}
        style={{ width: '100%', aspectRatio: '16 / 9', background: '#000' }} />
    </div>
  );
}

function DiagPanel({ diag }) {
  if (!diag?.length) return null;
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#333', background: '#fafafa', border: '1px dashed #ddd', padding: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Диагностика (последние события):</div>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {diag.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
    </div>
  );
}
