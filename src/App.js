// frontend/src/App.jsx
import React from 'react';
import JoinButton from './components/JoinButton';

export default function App() {
  // Когда подключишь SDK 100ms — передай сюда колбэк onToken={joinWithToken}
  return (
    <main style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Видеозвонок 100ms</h1>

        {/* Кнопка для ученика */}
        <div style={{ marginTop: 12 }}>
          <JoinButton role="guest" />
        </div>

        {/* Кнопка для преподавателя (если нужна на той же странице) */}
        {/* <div style={{ marginTop: 12 }}>
          <JoinButton role="host" />
        </div> */}
      </div>
    </main>
  );
}
