// frontend/src/components/JoinButton.jsx
import React, { useState } from 'react';
import { getToken } from '../api';

export default function JoinButton({ role = 'guest', onToken }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setErr('');
    try {
      const token = await getToken(role, 'WebUser');
      // Если у тебя уже есть функция join в проекте — вызови её здесь:
      if (typeof onToken === 'function') {
        onToken(token);
      } else {
        // Временно покажем, что токен получен — чтобы быстро проверить связку
        alert('Токен получен. Теперь вызывай join SDK 100ms.\n\n' + token.slice(0, 24) + '...');
        console.log('HMS token:', token);
      }
    } catch (e) {
      setErr(e.message || 'Не удалось получить токен');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={loading} style={{ padding: '10px 16px' }}>
        {loading ? 'Подключаюсь…' : 'Присоединиться'}
      </button>
      {err && <div style={{ color: 'crimson', marginTop: 8 }}>Ошибка: {err}</div>}
    </div>
  );
}
