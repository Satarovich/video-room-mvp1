// src/index.js (React 18)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HMSRoomProvider } from '@100mslive/react-sdk';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HMSRoomProvider>
      <App />
    </HMSRoomProvider>
  </React.StrictMode>
);
