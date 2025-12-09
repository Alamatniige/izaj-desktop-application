import { io, Socket } from 'socket.io-client';
import API_URL from '../../config/api';

let socket: Socket | null = null;

export interface Message {
  id: string;
  text: string;
  sender: 'customer' | 'admin';
  timestamp: Date;
  roomId: string;
  sessionId: string;
  productName?: string;
  preferredLanguage?: 'en' | 'tl';
}

export interface Conversation {
  roomId: string;
  sessionId: string;
  lastMessage: Message;
  unreadCount: number;
  productName?: string;
  customerEmail?: string;
  customerName?: string;
  createdAt: Date;
  adminConnected?: boolean;
  lastMessageAt?: Date;
  messages?: Message[];

}

export const getAdminSocket = (): Socket | null => {
  if (!socket) {
    const socketUrl = API_URL;
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'], // Allow polling as fallback
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    
    // Add error handlers
    socket.on('connect_error', (error) => {
      console.error('Admin socket connection error:', error.message);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Admin socket disconnected:', reason);
    });
  }
  return socket;
};

export const connectAdminSocket = (): Socket | null => {
  const adminSocket = getAdminSocket();
  if (!adminSocket) return null;
  
  if (!adminSocket.connected) {
    adminSocket.connect();
    
    // Wait for connection before joining admin room
    adminSocket.once('connect', () => {
      console.log('Admin socket connected, joining admins room...');
      adminSocket.emit('admin:join');
    });
  } else {
    // Already connected, join immediately
    adminSocket.emit('admin:join');
  }
  
  return adminSocket;
};

export const disconnectAdminSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

