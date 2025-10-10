import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

type Chat = {
  id: number;
  itemName: string;
  itemImage: string;
  lastMessage: string;
  lastDate: string; // ISO string
  unread?: number;
  archived?: boolean;
  pinned?: boolean;
};

type Message = {
  id: number;
  chatId: number;
  text: string;
  sender: 'izaj' | 'user';
  timestamp: Date;
  seen?: boolean;
};

interface ChatNowProps {
  onClose?: () => void;
}

// Mock data
const mockChats: Chat[] = [
  {
    id: 1,
    itemName: "Aberdeen Chandelier",
    itemImage: "aber.webp",
    lastMessage: "Hi there! Got a question?",
    lastDate: new Date().toISOString(),
    unread: 1,
    pinned: true,
  },
  {
    id: 2,
    itemName: "Floor Lamp",
    itemImage: "floor.jpg",
    lastMessage: "Can I get a discount?",
    lastDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    unread: 0,
    archived: false,
  },
];

const mockMessages: Message[] = [
  { id: 1, chatId: 1, text: "Hi there! Got a question?", sender: 'izaj', timestamp: new Date() },
  { id: 2, chatId: 1, text: "I'm here to help you with anything you need.", sender: 'izaj', timestamp: new Date() },
  { id: 3, chatId: 2, text: "Can I get a discount?", sender: 'user', timestamp: new Date(Date.now() - 86400000 * 2) },
  { id: 4, chatId: 2, text: "I'll check for you!", sender: 'izaj', timestamp: new Date(Date.now() - 86400000 * 2) },
];

const ChatNow: React.FC<ChatNowProps> = ({ onClose }) => {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(mockChats[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showArchived] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Remove auto-scroll effects
  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedChatId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedChatId]);

  // Filtered chats for search & archive
  const filteredChats = chats.filter(chat =>
    chat.itemName.toLowerCase().includes(search.toLowerCase()) &&
    (showArchived ? chat.archived : !chat.archived)
  );

  // Sort: pinned first, then latest
  const sortedChats = [...filteredChats].sort((a, b) => {
    if ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) !== 0) {
      return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    }
    return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
  });

  // Messages for the selected chat
  const conversation = messages.filter(msg => msg.chatId === selectedChatId);

  // Fix: Format message time for both Date and string
  const formatMsgTimestamp = (ts: Date | string) => {
    const date = typeof ts === 'string' ? new Date(ts) : ts;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get chat by ID
  const getChatById = (id: number) => chats.find(c => c.id === id);

  // Handle sending a message
  const handleSend = () => {
    if (!inputValue.trim() || !selectedChatId) return;
    const now = new Date();
    const newMsg: Message = {
      id: messages.length + 1,
      chatId: selectedChatId,
      text: inputValue,
      sender: 'user',
      timestamp: now,
      seen: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');

    // Simulate izaj's reply
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          chatId: selectedChatId,
          text: 'Thanks for your message! How else can I assist you?',
          sender: 'izaj',
          timestamp: new Date(),
          seen: false,
        },
      ]);
    }, 900);

    // Update last message and date on chat list, bump unread for izaj reply
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === selectedChatId
          ? {
              ...chat,
              lastMessage: inputValue,
              lastDate: now.toISOString(),
              unread: 0,
              archived: false,
              pinned: chat.pinned,
            }
          : chat
      )
    );
  };

  // Handle pressing Enter in input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Archive a chat

  // Unarchive
  const handleUnarchive = (id: number) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, archived: false } : c));
  };

  // Pin/unpin
  const handlePin = (id: number) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  };

  // Delete chat (removes from list)
  const handleDelete = (id: number) => {
    setChats(prev => prev.filter(c => c.id !== id));
    setMessages(prev => prev.filter(m => m.chatId !== id));
    if (selectedChatId === id) setSelectedChatId(null);
  };

  // Show last message time (hh:mm or dd/mm)
  const formatMsgTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-GB');
  };

  // Mark chat as read on select
  useEffect(() => {
    if (!selectedChatId) return;
    setChats(prev =>
      prev.map(chat =>
        chat.id === selectedChatId ? { ...chat, unread: 0 } : chat
      )
    );
    setMessages(prev =>
      prev.map(msg =>
        msg.chatId === selectedChatId ? { ...msg, seen: true } : msg
      )
    );
  }, [selectedChatId]);

  // Add chat (demo)

  // Fix: Ensure all chat images use public path
  const getImagePath = (img: string) => img.startsWith('/') ? img : `/${img}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col min-h-0 items-center justify-center p-2 bg-black/30 backdrop-blur-sm" onClick={() => onClose && onClose()}>
      <div
        className="flex h-[90vh] w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
        style={{ height: '90vh', minHeight: 540, maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left: Chat list */}
        <div className="w-1/3 min-w-[260px] max-w-[350px] border-r bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col relative">
          <div className="flex items-center p-4 border-b bg-white sticky top-0 z-10 gap-2">
            <span className="text-2xl font-extrabold text-black tracking-tight">IZAJ Assistant</span>
            <span className="ml-2 text-black text-base font-semibold bg-white/30 rounded px-2">{chats.filter(c => !c.archived).length}</span>
          </div>
          <div className="p-2 flex gap-2 items-center bg-white sticky top-[64px] z-10">
            <input
              className="w-full px-3 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-200 transition"
              placeholder="Search item or chat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {sortedChats.length > 0 ? (
              sortedChats.map(chat => (
                <div
                  key={chat.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer group hover:bg-yellow-50 border-b border-gray-100 transition relative ${chat.id === selectedChatId ? 'bg-yellow-100' : ''}`}
                  onClick={() => setSelectedChatId(chat.id)}
                >
                  <img src={getImagePath(chat.itemImage)} alt={chat.itemName} className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base truncate flex items-center gap-1 text-black">
                      {chat.itemName}
                      {chat.pinned && (
                        <span title="Pinned">
                          <Icon icon="mdi:pin" width={16} height={16} className="text-yellow-400" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{chat.lastMessage}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 min-w-[45px]">
                    <div className="text-[11px] text-gray-400">{formatMsgTime(chat.lastDate)}</div>
                    {!!chat.unread && (
                      <span className="bg-red-500 text-white rounded-full px-2 py-[2px] text-xs font-bold">{chat.unread}</span>
                    )}
                  </div>
                  {/* Chat menu (archive/pin/delete) */}
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition">
                    {!chat.archived ? (
                      <div className="flex gap-2">
                        <button
                          className="rounded-full hover:bg-yellow-200 p-1"
                          // Use a span for title to avoid Iconify error
                          onClick={e => { e.stopPropagation(); handlePin(chat.id); }}
                        >
                          <span title={chat.pinned ? "Unpin chat" : "Pin chat"}>
                            <Icon icon={chat.pinned ? "mdi:pin-off" : "mdi:pin"} width={17} height={17} />
                          </span>
                        </button>
                        <button
                          className="rounded-full hover:bg-gray-200 p-1"
                          onClick={e => { e.stopPropagation(); handleDelete(chat.id); }}
                        >
                          <span title="Delete chat">
                            <Icon icon="mdi:delete" width={17} height={17} />
                          </span>
                        </button>
                      </div>
                    ) : (
                      <button
                        className="rounded-full hover:bg-green-100 p-1"
                        onClick={e => { e.stopPropagation(); handleUnarchive(chat.id); }}
                      >
                        <span title="Unarchive chat">
                          <Icon icon="mdi:archive-arrow-up" width={17} height={17} />
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-12">No chats found.</div>
            )}
          </div>
        </div>
        {/* Right: Conversation */}
        <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-br from-white to-yellow-50 relative">
          {!selectedChatId ? (
            <div className="flex flex-col items-center justify-center flex-1">
              <Icon icon="mdi:chat-outline" className="text-yellow-200" width={80} height={80} />
              <div className="font-extrabold text-2xl mt-6 mb-2 text-yellow-600">Welcome to ChatNow</div>
              <div className="text-gray-500 mb-10">Start responding to your buyers now!</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center p-4 border-b gap-3 bg-white sticky top-0 z-10 shadow-sm">
                <img src={getImagePath(getChatById(selectedChatId)?.itemImage || '')} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                <span className="font-bold text-black text-lg">
                  {getChatById(selectedChatId)?.itemName}
                </span>
                {getChatById(selectedChatId)?.archived && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-100 rounded text-red-500 font-bold">ARCHIVED</span>
                )}
                <button
                  className="ml-auto text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded p-1 transition"
                  onClick={onClose}
                >
                  <Icon icon="mdi:close" width={20} height={20} />
                </button>
              </div>
              {/* Messages */}
              <div
                ref={conversationRef}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-2 bg-gradient-to-b from-yellow-50/40 to-white scrollbar-thin"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#fbbf24 #f3f4f6',
                  msOverflowStyle: 'auto'
                }}
              >
                <style>
                  {`
                  /* Custom scrollbar for conversation area */
                  .scrollbar-thin::-webkit-scrollbar {
                    width: 8px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #fbbf24;
                    border-radius: 8px;
                  }
                  .scrollbar-thin::-webkit-scrollbar-track {
                    background: #f3f4f6;
                  }
                  `}
                </style>
                <div>
                  {conversation.length === 0 ? (
                    <div className="text-gray-400 flex flex-col items-center justify-center h-full pt-20">
                      No messages yet.
                    </div>
                  ) : (
                    conversation.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex my-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-2 text-sm max-w-xs relative shadow ${
                            msg.sender === 'user'
                              ? 'bg-yellow-200 text-black rounded-tr-none'
                              : 'bg-white text-gray-800 rounded-tl-none border'
                          }`}
                        >
                          {msg.text}
                          <div className="flex justify-end mt-1 gap-1 items-center">
                            <span className="text-[10px] text-gray-400">
                              {formatMsgTimestamp(msg.timestamp)}
                            </span>
                            {msg.sender === 'user' && msg.seen && (
                              <span title="Seen">
                                <Icon icon="mdi:check-all" width={14} height={14} className="ml-1 text-gray-400" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              {/* Input */}
              <div className="p-4 border-t bg-white flex gap-2 items-center shadow-md">
                <input
                  ref={inputRef}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-yellow-200 transition"
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  disabled={!selectedChatId || getChatById(selectedChatId)?.archived}
                  aria-label="Type your message"
                  autoFocus
                />
                <button
                  className={`px-4 py-2 rounded-full bg-yellow-400 text-black font-medium transition disabled:opacity-60 shadow ${(!inputValue.trim() || !selectedChatId || getChatById(selectedChatId)?.archived) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  onClick={handleSend}
                  disabled={!inputValue.trim() || !selectedChatId || getChatById(selectedChatId)?.archived}
                  aria-label="Send message"
                >
                  <Icon icon="mdi:send" width={20} height={20} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatNow;