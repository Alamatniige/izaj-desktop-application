import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { Session } from '@supabase/supabase-js';
import { connectAdminSocket, getAdminSocket, Message, Conversation } from '../services/messagingService';
import API_URL from '../../config/api';

interface MessagesProps {
  session: Session | null;
}

const Messages = ({ session }: MessagesProps) => {
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [connectedRooms, setConnectedRooms] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const markConversationRead = useCallback(async (roomId: string) => {
    // Optimistic local update
    setConversations(prev => {
      const updated = new Map(prev);
      const existing = updated.get(roomId);
      if (existing) {
        updated.set(roomId, { ...existing, unreadCount: 0 });
      }
      return updated;
    });

    if (!session) return;
    try {
      await fetch(`${API_URL}/api/messaging/conversations/${roomId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Error marking conversation as read:', err);
    }
  }, [session]);

  // Load conversations from database on mount
  useEffect(() => {
    const loadConversations = async () => {
      if (!session) return;
      
      try {
        const response = await fetch(`${API_URL}/api/messaging/conversations`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        
        if (data.success && data.conversations) {
          const convsMap = new Map<string, Conversation>();
          
          data.conversations.forEach((conv: any) => {
            // Get last message - check last_message first, then messages array
            let lastMsg = conv.last_message || null;
            if (!lastMsg && conv.messages && conv.messages.length > 0) {
              // Sort messages by created_at descending and get first one
              const sortedMessages = [...conv.messages].sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              lastMsg = sortedMessages[0];
            }
            
            convsMap.set(conv.room_id, {
              roomId: conv.room_id,
              sessionId: conv.session_id,
              lastMessage: {
                id: lastMsg?.id || Date.now().toString(),
                text: lastMsg?.message_text || '',
                sender: (lastMsg?.sender_type === 'customer' ? 'customer' : 'admin') as 'customer' | 'admin',
                timestamp: lastMsg ? new Date(lastMsg.created_at) : new Date(conv.last_message_at || conv.created_at),
                roomId: conv.room_id,
                sessionId: conv.session_id,
                productName: conv.product_name,
              },
              unreadCount: conv.unreadCount || 0,
              productName: conv.product_name,
              customerEmail: conv.customer_email,
              customerName: conv.customer_name,
              createdAt: new Date(conv.created_at),
              adminConnected: conv.admin_connected || false,
            });
          });
          
          // Sort conversations by last message time (newest first)
          const sortedConvs = Array.from(convsMap.entries()).sort((a, b) => 
            b[1].lastMessage.timestamp.getTime() - a[1].lastMessage.timestamp.getTime()
          );
          
          const sortedConvsMap = new Map(sortedConvs);
          setConversations(sortedConvsMap);
          
          // Auto-select first conversation if none selected
          if (!selectedConversation && sortedConvsMap.size > 0) {
            const firstRoomId = sortedConvs[0][0];
            setSelectedConversation(firstRoomId);
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };
    
    loadConversations();
  }, [session]);

  // Load messages for selected conversation from database and join room
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversation || !session) return;
      
      setIsLoadingMessages(true);
      try {
        const response = await fetch(`${API_URL}/api/messaging/conversations/${selectedConversation}/messages`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        
        if (data.success && data.messages) {
          // Sort messages by timestamp to ensure correct order
          const sortedMessages = [...data.messages].sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          const loadedMessages: Message[] = sortedMessages.map((msg: any) => ({
            id: msg.id || Date.now().toString(),
            text: msg.message_text || '',
            sender: (msg.sender_type === 'customer' ? 'customer' : 'admin') as 'customer' | 'admin',
            timestamp: new Date(msg.created_at),
            roomId: msg.room_id,
            sessionId: msg.session_id,
            productName: msg.product_name,
          }));
          
          setMessages(prev => {
            const updated = new Map(prev);
            updated.set(selectedConversation, loadedMessages);
            return updated;
          });
          
          // Update admin_connected status and customer info in conversations map
          if (data.conversation && data.conversation.admin_connected !== undefined) {
            setConversations(prev => {
              const updated = new Map(prev);
              const existing = updated.get(selectedConversation);
              if (existing) {
                updated.set(selectedConversation, {
                  ...existing,
                  adminConnected: data.conversation.admin_connected,
                  customerName: data.conversation.customer_name || existing.customerName,
                  customerEmail: data.conversation.customer_email || existing.customerEmail,
                });
                // Update connectedRooms based on admin_connected status
                if (data.conversation.admin_connected) {
                  setConnectedRooms(prev => new Set(prev).add(selectedConversation));
                } else {
                  setConnectedRooms(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedConversation);
                    return newSet;
                  });
                }
              }
              return updated;
            });
          }
          
          console.log(`📥 [Admin] Loaded ${loadedMessages.length} messages for conversation: ${selectedConversation}`);
        }
        
        // Join the room when conversation is selected
        const socket = getAdminSocket();
        if (socket && socket.connected && selectedConversation) {
          const conversation = conversations.get(selectedConversation);
          if (conversation) {
            // Emit join room event (we'll handle this on server if needed)
            // For now, admin:connect will handle joining the room
            console.log(`📥 [Admin] Joining room: ${selectedConversation}`);
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    loadMessages();
  }, [selectedConversation, session]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && selectedConversation) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedConversation]);

  // Connect to socket on mount
  useEffect(() => {
    const socket = connectAdminSocket();
    if (!socket) {
      console.error('Failed to get admin socket');
      return;
    }

    const handleConnect = () => {
      console.log('✅ [Admin] Socket connected');
      setIsConnected(true);
      // Join admins room after connection
      socket.emit('admin:join');
      console.log('✅ [Admin] Emitted admin:join event');
    };

    const handleDisconnect = () => {
      console.log('❌ [Admin] Socket disconnected');
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Listen for new conversation requests from customers
    socket.on('admin:customer-request', async (data: any) => {
      console.log('📞 [Admin] New conversation request received:', data);
      
      // Reload conversations to show the new one
      if (session) {
        try {
          const response = await fetch(`${API_URL}/api/messaging/conversations`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });
          
          const result = await response.json();
          
          if (result.success && result.conversations) {
            const convsMap = new Map<string, Conversation>();
            
            // Sort conversations by last_message_at (newest first)
            const sortedConvs = [...result.conversations].sort((a: any, b: any) => 
              new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
            );
            
            sortedConvs.forEach((conv: any) => {
              let lastMsg = conv.last_message || null;
              if (!lastMsg && conv.messages && conv.messages.length > 0) {
                const sortedMessages = [...conv.messages].sort((a: any, b: any) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                lastMsg = sortedMessages[0];
              }
              
              convsMap.set(conv.room_id, {
                roomId: conv.room_id,
                sessionId: conv.session_id,
                lastMessage: {
                  id: lastMsg?.id || Date.now().toString(),
                  text: lastMsg?.message_text || '',
                  sender: (lastMsg?.sender_type === 'customer' ? 'customer' : 'admin') as 'customer' | 'admin',
                  timestamp: lastMsg ? new Date(lastMsg.created_at) : new Date(conv.last_message_at || conv.created_at),
                  roomId: conv.room_id,
                  sessionId: conv.session_id,
                  productName: conv.product_name,
                },
                unreadCount: conv.unreadCount || 0,
                productName: conv.product_name,
                customerEmail: conv.customer_email,
                customerName: conv.customer_name,
                createdAt: new Date(conv.created_at),
                adminConnected: conv.admin_connected || false,
              });
              
              // Update connectedRooms based on admin_connected status
              if (conv.admin_connected) {
                setConnectedRooms(prev => new Set(prev).add(conv.room_id));
              }
            });
            
            setConversations(convsMap);
            
            // If no conversation is selected, auto-select the newest one
            if (!selectedConversation && convsMap.size > 0) {
              const firstRoomId = Array.from(convsMap.keys())[0];
              setSelectedConversation(firstRoomId);
            }
            
            console.log(`✅ [Admin] Reloaded conversations, found ${convsMap.size} conversations`);
          }
        } catch (error) {
          console.error('Error reloading conversations:', error);
        }
      }
    });

    socket.on('admin:incoming', (message: any) => {
      console.log('📨 [Admin] Received customer message:', message);
      console.log('📨 [Admin] Full message object:', JSON.stringify(message, null, 2));
      
      // Convert backend format to frontend format
      const msg: Message = {
        id: message.id || Date.now().toString(),
        text: message.text || '',
        sender: (message.from === 'customer' ? 'customer' : 'admin') as 'customer' | 'admin',
        timestamp: message.sentAt ? new Date(message.sentAt) : new Date(),
        roomId: message.roomId || '',
        sessionId: message.sessionId || '',
        productName: message.productName,
        preferredLanguage: message.preferredLanguage,
      };

      // Update messages for this conversation
      setMessages(prev => {
        const roomMessages = prev.get(msg.roomId) || [];
        // Check if message already exists to avoid duplicates
        const exists = roomMessages.some(m => 
          (m.id === msg.id) ||
          (m.text === msg.text && 
           Math.abs(m.timestamp.getTime() - msg.timestamp.getTime()) < 2000)
        );
        if (exists) return prev;
        
        const updated = new Map(prev);
        const newMessages = [...roomMessages, msg];
        // Sort by timestamp to maintain order
        newMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        updated.set(msg.roomId, newMessages);
        return updated;
      });

      // Update conversation
      setConversations(prev => {
        const updated = new Map(prev);
        const existing = updated.get(msg.roomId);
        updated.set(msg.roomId, {
          roomId: msg.roomId,
          sessionId: msg.sessionId,
          lastMessage: msg,
          unreadCount: existing ? existing.unreadCount + (selectedConversation === msg.roomId ? 0 : 1) : 1,
          productName: msg.productName,
          customerEmail: existing?.customerEmail || message.customerEmail,
          customerName: existing?.customerName || message.customerName,
          createdAt: existing?.createdAt || msg.timestamp,
        });
        return updated;
      });

      // If currently viewing this conversation, mark as read in backend
      if (selectedConversation === msg.roomId) {
        markConversationRead(msg.roomId);
      }
    });

    // Listen for admin messages (sent by this admin or other admins)
    socket.on('admin:message', (message: any) => {
      console.log('📤 [Admin] Received admin message:', message);
      
      const msg: Message = {
        id: message.id || Date.now().toString(),
        text: message.text || '',
        sender: 'admin',
        timestamp: message.sentAt ? new Date(message.sentAt) : new Date(),
        roomId: message.roomId || '',
        sessionId: conversations.get(message.roomId)?.sessionId || message.sessionId || '',
        productName: message.productName,
      };

      // Only add if not already in messages (avoid duplicates)
      setMessages(prev => {
        const roomMessages = prev.get(msg.roomId) || [];
        // Check if message already exists
        const exists = roomMessages.some(m => 
          (m.id === msg.id) ||
          (m.text === msg.text && Math.abs(m.timestamp.getTime() - msg.timestamp.getTime()) < 2000)
        );
        if (exists) return prev;
        
        const updated = new Map(prev);
        const newMessages = [...roomMessages, msg];
        // Sort by timestamp to maintain order
        newMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        updated.set(msg.roomId, newMessages);
        return updated;
      });
      
      // Update conversation last message
      setConversations(prev => {
        const updated = new Map(prev);
        const existing = updated.get(msg.roomId);
        if (existing) {
          updated.set(msg.roomId, {
            ...existing,
            lastMessage: msg,
          });
        }
        return updated;
      });
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('admin:customer-request');
      socket.off('admin:incoming');
      socket.off('admin:message');
    };
  }, [selectedConversation, conversations, session]);

  const handleSend = () => {
    if (!inputValue.trim() || !selectedConversation) return;

    const socket = getAdminSocket();
    if (!socket || !socket.connected) {
      alert('Not connected to server. Please refresh the page.');
      return;
    }

    const conversation = conversations.get(selectedConversation);
    if (!conversation) {
      console.error('Conversation not found');
      return;
    }
    
    // Check if admin is connected to this conversation
    if (!connectedRooms.has(selectedConversation) && !conversation.adminConnected) {
      alert('Please click the "Connect" button first before sending messages.');
      return;
    }

    const adminMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'admin',
      timestamp: new Date(),
      roomId: selectedConversation,
      sessionId: conversation.sessionId,
    };

    console.log('📤 [Admin] Sending message:', { 
      roomId: selectedConversation, 
      sessionId: conversation.sessionId, 
      text: inputValue 
    });

    // Don't allow sending messages if not connected - admin must click Connect button first
    if (!connectedRooms.has(selectedConversation) && !conversation.adminConnected) {
      alert('Please click the "Connect" button first before sending messages.');
      return;
    }
    
    // Auto-connect only if admin is already connected (for sending messages)
    // But don't auto-connect on first message - admin must explicitly connect first
    if (!connectedRooms.has(selectedConversation) && conversation.adminConnected) {
      console.log(`🔌 [Admin] Already connected in database, syncing local state: ${selectedConversation}`);
      setConnectedRooms(prev => new Set(prev).add(selectedConversation));
    }

    // Emit admin message with senderId
    socket.emit('admin:message', {
      roomId: selectedConversation,
      sessionId: conversation.sessionId,
      senderId: session?.user?.id || null,
      text: inputValue,
    });

    // Add to local messages immediately (optimistic update)
    setMessages(prev => {
      const roomMessages = prev.get(selectedConversation) || [];
      const updated = new Map(prev);
      const newMessages = [...roomMessages, adminMessage];
      // Sort by timestamp to maintain order
      newMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      updated.set(selectedConversation, newMessages);
      return updated;
    });

    // Update conversation
    setConversations(prev => {
      const updated = new Map(prev);
      const existing = updated.get(selectedConversation);
      if (existing) {
        updated.set(selectedConversation, {
          ...existing,
          lastMessage: adminMessage,
        });
      }
      return updated;
    });

    setInputValue('');
    
    // No need to reload messages - socket will handle real-time updates and we already did optimistic update
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getDisplayName = (conv?: Conversation) => {
    if (!conv) return 'Customer';
    if (conv.customerName && conv.customerName.trim().length > 0) return conv.customerName;
    if (conv.customerEmail) return conv.customerEmail.split('@')[0];
    if (conv.sessionId) return conv.sessionId.substring(0, 8);
    return 'Customer';
  };

  const sortedConversations = Array.from(conversations.values()).sort((a, b) => {
    return b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime();
  });

  const filteredConversations = sortedConversations.filter((conv) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const name = getDisplayName(conv).toLowerCase();
    const email = (conv.customerEmail || '').toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  const currentMessages = selectedConversation ? messages.get(selectedConversation) || [] : [];
  const currentConversation = selectedConversation ? conversations.get(selectedConversation) : null;
  const isConversationConnected = currentConversation ? (connectedRooms.has(selectedConversation!) || currentConversation.adminConnected) : false;

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Icon icon="mdi:message-text" className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Jost', sans-serif" }}>
                Customer Messages
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0" style={{ flex: '1 1 auto', minHeight: 0 }}>
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0 flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-200" style={{ fontFamily: "'Jost', sans-serif" }}>
                Conversations
              </h4>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name or email"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: "'Jost', sans-serif" }}
            />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ overflowY: 'auto', height: '100%' }}>
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <Icon icon="mdi:message-outline" className="text-gray-400 text-6xl mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                No conversations yet
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                Customer messages will appear here
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.roomId}
                  onClick={() => {
                    // Clear any previous selection
                    setSelectedConversation(conv.roomId);
                    
                  // Mark as read (local + API)
                  markConversationRead(conv.roomId);
                    
                    // Don't auto-connect - admin must click Connect button manually
                    // This ensures admin explicitly chooses to connect to each conversation
                  }}
                  className={`w-full p-3 rounded-lg mb-2 text-left transition-all ${
                    selectedConversation === conv.roomId
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {getDisplayName(conv)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {conv.productName ? `Product: ${conv.productName}` : 'Customer Chat'}
                      </p>
                      {conv.customerEmail && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-0.5" style={{ fontFamily: "'Jost', sans-serif" }}>
                          📧 {conv.customerEmail}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {conv.lastMessage.text}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500" style={{ fontFamily: "'Jost', sans-serif" }}>
                    {formatTime(conv.lastMessage.timestamp)}
                  </p>
                </button>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden max-h-full">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {getDisplayName(conversations.get(selectedConversation) || undefined)}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {conversations.get(selectedConversation)?.productName 
                        ? `Product: ${conversations.get(selectedConversation)?.productName}`
                        : 'Customer Conversation'}
                    </p>
                    {conversations.get(selectedConversation)?.customerEmail && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                        <Icon icon="mdi:email" className="text-base" />
                        {conversations.get(selectedConversation)?.customerEmail}
                      </p>
                    )}
                    {/* Session hidden as requested */}
                  </div>
                  {(connectedRooms.has(selectedConversation) || conversations.get(selectedConversation)?.adminConnected) ? (
                    <button
                      onClick={() => {
                        const socket = getAdminSocket();
                        if (!socket || !socket.connected) {
                          alert('Not connected to server. Please refresh the page.');
                          return;
                        }
                        
                        const conversation = conversations.get(selectedConversation);
                        if (conversation) {
                          console.log(`🔌 [Admin] Disconnecting from room: ${selectedConversation}`);
                          
                          // Mark as disconnected locally
                          setConnectedRooms(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(selectedConversation);
                            return newSet;
                          });
                          
                          // Update conversation adminConnected status
                          setConversations(prev => {
                            const updated = new Map(prev);
                            const existing = updated.get(selectedConversation);
                            if (existing) {
                              updated.set(selectedConversation, {
                                ...existing,
                                adminConnected: false,
                              });
                            }
                            return updated;
                          });
                          
                          // Emit admin:disconnect event (will update database via socket handler)
                          socket.emit('admin:disconnect', {
                            roomId: selectedConversation,
                            sessionId: conversation.sessionId,
                          });
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      <Icon icon="mdi:account-off" className="text-lg" />
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const socket = getAdminSocket();
                        if (!socket || !socket.connected) {
                          alert('Not connected to server. Please refresh the page.');
                          return;
                        }
                        
                        const conversation = conversations.get(selectedConversation);
                        if (conversation) {
                          console.log(`🔌 [Admin] Connecting to room: ${selectedConversation}`);
                          
                          // Mark as connected locally
                          setConnectedRooms(prev => new Set(prev).add(selectedConversation));
                          
                          // Update conversation adminConnected status
                          setConversations(prev => {
                            const updated = new Map(prev);
                            const existing = updated.get(selectedConversation);
                            if (existing) {
                              updated.set(selectedConversation, {
                                ...existing,
                                adminConnected: true,
                              });
                            }
                            return updated;
                          });
                          
                          // Emit admin:connect event (will update database via socket handler)
                          socket.emit('admin:connect', {
                            roomId: selectedConversation,
                            sessionId: conversation.sessionId,
                          });
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    >
                      <Icon icon="mdi:account-check" className="text-lg" />
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Messages - Scrollable Container */}
              <div className="flex-1 min-h-0 max-h-full overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900" style={{ height: '100%' }}>
                {isLoadingMessages ? (
                  <div className="text-center py-8">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                    <p className="text-gray-500 dark:text-gray-400 mt-4" style={{ fontFamily: "'Jost', sans-serif" }}>
                      Loading messages...
                    </p>
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400" style={{ fontFamily: "'Jost', sans-serif" }}>
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentMessages.map((msg, index) => {
                      const showDate = index === 0 || 
                        new Date(msg.timestamp).toDateString() !== new Date(currentMessages[index - 1].timestamp).toDateString();
                      
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="text-center my-4">
                              <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-xs" style={{ fontFamily: "'Jost', sans-serif" }}>
                                {formatDate(msg.timestamp)}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[70%] px-4 py-2 rounded-lg ${
                                msg.sender === 'admin'
                                  ? 'bg-blue-500 text-white rounded-br-sm'
                                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              <p className="text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>{msg.text}</p>
                              <p className={`text-xs mt-1 ${msg.sender === 'admin' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`} style={{ fontFamily: "'Jost', sans-serif" }}>
                                {formatTime(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={!isConversationConnected ? "Click 'Connect' button first..." : "Type your message..."}
                      disabled={!isConversationConnected}
                      rows={1}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: "'Jost', sans-serif" }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || !isConnected || !isConversationConnected}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                    title={!isConversationConnected ? "Please click 'Connect' button first" : ""}
                  >
                    <Icon icon="mdi:send" className="text-xl" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon icon="mdi:message-outline" className="text-gray-400 text-6xl mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg" style={{ fontFamily: "'Jost', sans-serif" }}>
                  Select a conversation to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;

