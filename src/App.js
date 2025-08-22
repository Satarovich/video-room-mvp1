// src/App.jsx
import React, { useState } from 'react';
import Call from './components/Call';

export default function App() {
  const [role, setRole] = useState('guest'); // по умолчанию — Ученик

  return (
    <main style={{ display: 'grid', gap: 16, placeItems: 'center', padding: 24 }}>
      <h1>Онлайн-уроки (100ms)</h1>

      {/* Переключатель роли — на странице всегда ОДИН звонок */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setRole('guest')} disabled={role === 'guest'}>Роль: Ученик</button>
        <button onClick={() => setRole('host')}  disabled={role === 'host'}>Роль: Преподаватель</button>
      </div>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, width: 'min(980px, 100%)' }}>
        <Call role={role} />
      </section>
    </main>
  );
}
