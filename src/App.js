// src/App.jsx
import React from 'react';
import Call from './components/Call';

export default function App() {
  return (
    <main style={{ display: 'grid', gap: 20, placeItems: 'center', padding: 24 }}>
      <h1>Онлайн-уроки (100ms)</h1>

      {/* Блок ученика */}
      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, width: 'min(900px, 100%)' }}>
        <h2 style={{ marginTop: 0 }}>Ученик</h2>
        <Call role="guest" />
      </section>

      {/* Блок преподавателя */}
      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, width: 'min(900px, 100%)' }}>
        <h2 style={{ marginTop: 0 }}>Преподаватель</h2>
        <Call role="host" />
      </section>
    </main>
  );
}
