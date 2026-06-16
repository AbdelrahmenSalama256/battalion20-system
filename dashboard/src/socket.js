import { io } from 'socket.io-client';

let socket = null;
let notificationCallback = null;

export function initSocket(userId) {
  if (socket?.connected) return;
  const base = (import.meta.env.VITE_API_URL || '/api').replace('/api', '');
  socket = io(base || window.location.origin, {
    query: { userId },
    transports: ['websocket', 'polling'],
  });
  socket.on('notification', (data) => {
    if (notificationCallback) notificationCallback(data);
  });
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export function onNotification(callback) {
  notificationCallback = callback;
}
