import React, { useEffect, useState } from "react";
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
  selectPeers,
  useVideo
} from "@100mslive/react-sdk";
import axios from "axios";

const INNER_STYLE = { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 };

const PeerTile = ({ peer }) => {
  const trackId = peer.videoTrack?.trackId || peer.videoTrack?.id || undefined;
  const ref = useVideo(trackId);

  return (
    <div style={{ width: 240, border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
      <div style={{ fontWeight: 600 }}>{peer.name}{peer.isLocal ? " (я)" : ""}</div>
      <div style={{ marginTop: 8, background: '#000', height: 160 }}>
        <video ref={ref} autoPlay playsInline muted={peer.isLocal} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{peer.roleName || peer.role || ''}</div>
    </div>
  );
};

const Inner = ({ defaultRole }) => {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token && !isConnected) {
      (async () => {
        try {
          await hmsActions.join({ userName: 'AutoUser', authToken: token });
        } catch (e) {
          console.error('join error', e);
        }
      })();
    }
  }, [isConnected, hmsActions]);

  const joinViaBackend = async (role) => {
    setLoading(true);
    try {
      const resp = await axios.get((process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000') + `/get-token?role=${role}`);
      const token = resp.data.token;
      await hmsActions.join({ userName: role + '_' + Math.floor(Math.random()*1000), authToken: token });
    } catch (err) {
      console.error('joinViaBackend error', err && err.response ? err.response.data : err);
      alert('Ошибка получения токена — см консоль.');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => joinViaBackend('host')} disabled={loading}>Join as Host</button>
          <button onClick={() => joinViaBackend('guest')} disabled={loading}>Join as Guest</button>
        </div>
        <div>Или открой серверную ссылку: /join?role=host и вы будете редиректнуты на /room?token=...</div>
      </div>
    );
  }

  return (
    <div>
      <h3>Участники ({peers.length})</h3>
      <div style={INNER_STYLE}>
        {peers.map(p => <PeerTile key={p.id} peer={p} />)}
      </div>
    </div>
  );
};

export default function VideoRoom({ defaultRole }) {
  return (
    <HMSRoomProvider>
      <Inner defaultRole={defaultRole} />
    </HMSRoomProvider>
  );
}
