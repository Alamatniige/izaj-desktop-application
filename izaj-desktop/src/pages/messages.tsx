import { Icon } from '@iconify/react';
import { useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';


// Dummy data for messages
const messageListData = [
	{
		id: 1,
		name: 'Juan Dela Cruz',
		lastMessage: 'Hello, I have a question about my order #12345',
		time: '10:30 AM',
		unread: true,
		important: true,
		avatar: '/profile.webp',
		conversation: [
			{
				fromMe: false,
				text: 'Hello, I have a question about my order #12345',
				time: '10:30 AM',
			},
			{
				fromMe: true,
				text: 'Hi Juan! I\'m here to help you with your order. What would you like to know?',
				time: '10:31 AM',
			},
			{
				fromMe: false,
				text: 'I want to know the status of my shipment.',
				time: '10:32 AM',
			},
		],
	},
	{
		id: 2,
		name: 'Maria Santos',
		lastMessage: 'Thank you for the fast delivery!',
		time: 'Yesterday',
		unread: false,
		important: false,
		avatar: '/profile.webp',
		conversation: [
			{
				fromMe: false,
				text: 'Thank you for the fast delivery!',
				time: '09:00 AM',
			},
			{
				fromMe: true,
				text: 'You\'re welcome, Maria! We\'re glad you received your order. Is there anything else you need help with?',
				time: '09:01 AM',
			},
		],
	},
	{
		id: 3,
		name: 'Pedro Reyes',
		lastMessage: 'I need to cancel my order #12347',
		time: '2d ago',
		unread: false,
		important: true,
		avatar: '/profile.webp',
		conversation: [
			{
				fromMe: false,
				text: 'I need to cancel my order #12347',
				time: '2d ago',
			},
		],
	},
];

interface MessagesProps {
	handleNavigation?: (page: string) => void;
	session: Session | null;
}

function Messages({ handleNavigation, session }: MessagesProps) {

	console.log('Messages Session:',  session?.user.id);

	const [selectedFilter, setSelectedFilter] = useState('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
	const [newMessageText, setNewMessageText] = useState('');
	const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
	const [isTyping, setIsTyping] = useState(false);
	const [isMobileView, setIsMobileView] = useState(false);
	const [showMessageList, setShowMessageList] = useState(true);

	// Ref for auto-scrolling conversation
	const conversationEndRef = useRef<HTMLDivElement | null>(null);

	// Add window resize listener
	useEffect(() => {
		const handleResize = () => {
			setIsMobileView(window.innerWidth < 1024);
			if (window.innerWidth >= 1024) {
				setShowMessageList(true);
			}
		};

		handleResize(); // Initial check
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const filteredMessages = messageListData.filter(message => {
		const matchesSearch = message.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			message.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

		if (selectedFilter === 'unread') return matchesSearch && message.unread;
		if (selectedFilter === 'important') return matchesSearch && message.important;
		return matchesSearch;
	});

	const handleMessageSelect = (messageId: number) => {
		setSelectedMessage(messageId);
		const message = messageListData.find(m => m.id === messageId);
		if (message && message.unread) {
			message.unread = false;
		}
	};

	const handleSendMessage = () => {
		if (!newMessageText.trim() || !selectedMessage) return;
		const message = messageListData.find(m => m.id === selectedMessage);
		if (message) {
			message.conversation.push({
				fromMe: true,
				text: newMessageText,
				time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
			});
			message.lastMessage = newMessageText;
			message.time = 'Just now';
			setNewMessageText('');
		}
	};

	const handleBulkSelect = (messageId: number) => {
		setSelectedMessages(prev => {
			if (prev.includes(messageId)) {
				return prev.filter(id => id !== messageId);
			}
			return [...prev, messageId];
		});
	};

	const handleMarkAsRead = () => {
		selectedMessages.forEach(id => {
			const message = messageListData.find(m => m.id === id);
			if (message) message.unread = false;
		});
		setSelectedMessages([]);
	};

	const handleMarkAsImportant = () => {
		selectedMessages.forEach(id => {
			const message = messageListData.find(m => m.id === id);
			if (message) message.important = !message.important;
		});
		setSelectedMessages([]);
	};

	const handleDeleteMessages = () => {
		selectedMessages.forEach(id => {
			const index = messageListData.findIndex(m => m.id === id);
			if (index !== -1) {
				messageListData.splice(index, 1);
			}
		});
		setSelectedMessages([]);
	};

	// Effect for auto-scroll to last message when conversation updates or new message
	useEffect(() => {
		if (conversationEndRef.current) {
			conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedMessage, messageListData.find(m => m.id === selectedMessage)?.conversation.length, newMessageText]);

	return (
		<div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f7f8fa]">
			{/* Section Header */}
			<header className="px-4 sm:px-8 py-4 sm:py-6 bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
				<div className="max-w-7xl mx-auto">
					<div className="flex items-center gap-3">
						{isMobileView && (
							<button
								onClick={() => handleNavigation?.('DASHBOARD')}
								className="p-2 hover:bg-purple-50 rounded-lg transition"
							>
								<Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
							</button>
						)}
						<h2 className="flex items-center gap-3 text-2xl sm:text-3xl font-bold text-gray-800">
							<Icon icon="mdi:message-outline" className="text-purple-400 w-6 h-6 sm:w-8 sm:h-8" />
							Messages
						</h2>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 px-4 sm:px-8 py-4 sm:py-8 bg-[#f7f8fa] overflow-hidden">
				<div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 sm:gap-8 h-[calc(100vh-40px)] sm:h-[650px]">
					{/* Left Column - Messages List */}
					<div className={`w-full lg:w-[375px] lg:min-w-[320px] lg:max-w-[430px] bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col p-4 sm:p-5 ${isMobileView && selectedMessage ? 'hidden' : showMessageList ? 'flex' : 'hidden'}`}>
						{/* Search and Filter */}
						<div className="mb-4 sm:mb-5">
							<div className="relative flex flex-col sm:flex-row gap-2">
								<div className="relative flex-1">
									<Icon icon="mdi:magnify" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
									<input
										type="text"
										placeholder="Search messages..."
										className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-200 bg-[#f9f9fc]"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>
								<div className="relative">
									<select
										className="w-full sm:w-auto appearance-none bg-white border border-gray-200 rounded-lg py-2 pl-4 pr-8 leading-tight focus:outline-none focus:bg-white focus:border-purple-200 focus:ring-2 focus:ring-purple-100"
										value={selectedFilter}
										onChange={(e) => setSelectedFilter(e.target.value)}
									>
										<option value="all">All</option>
										<option value="unread">Unread</option>
										<option value="important">Important</option>
									</select>
									<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
										<Icon icon="mdi:chevron-down" className="w-5 h-5" />
									</div>
								</div>
							</div>
						</div>

						{/* Bulk Actions */}
						{selectedMessages.length > 0 && (
							<div className="flex items-center gap-3 mb-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
								<span className="text-sm text-purple-600">{selectedMessages.length} selected</span>
								<button 
									className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-100 rounded transition"
									onClick={handleMarkAsRead}
								>
									Mark as Read
								</button>
								<button 
									className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-100 rounded transition"
									onClick={handleMarkAsImportant}
								>
									Mark as Important
								</button>
								<button 
									className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded transition"
									onClick={handleDeleteMessages}
								>
									Delete
								</button>
							</div>
						)}

						{/* Messages List */}
						<div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
							{filteredMessages.length === 0 && (
								<div className="text-gray-400 text-center mt-10">No messages found</div>
							)}
							{filteredMessages.map((message) => (
								<div 
									key={message.id} 
									className={`relative flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition
										${selectedMessage === message.id ? 'bg-purple-100 border-purple-300 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50'}
										${message.unread ? 'ring-2 ring-purple-100' : ''}
									`}
									onClick={() => handleMessageSelect(message.id)}
								>
									<div className="flex-shrink-0 w-11 h-11 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden">
										<img src={message.avatar} alt={message.name} className="w-full h-full object-cover" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between">
											<h3 className={`font-semibold truncate ${message.unread ? 'text-purple-700' : 'text-gray-800'}`}>{message.name}</h3>
											<span className="text-xs text-gray-400 font-medium">{message.time}</span>
										</div>
										<p className={`truncate text-sm mt-1 ${message.unread ? 'font-medium text-gray-800' : 'text-gray-500'}`}>{message.lastMessage}</p>
									</div>
									{/* Checkbox and Star Icon Container (vertical column) */}
									<div className="flex flex-col items-center gap-2 pr-1">
										<input 
											type="checkbox"
											checked={selectedMessages.includes(message.id)}
											onChange={(e) => {
												e.stopPropagation();
												handleBulkSelect(message.id);
											}}
											className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 mb-1"
										/>
										<Icon 
											icon={message.important ? "mdi:star" : "mdi:star-outline"} 
											className={`w-5 h-5 ${message.important ? 'text-yellow-400' : 'text-gray-300'}`}
											onClick={(e) => {
												e.stopPropagation();
												message.important = !message.important;
											}}
										/>
										{message.unread && <span className="w-2 h-2 rounded-full bg-purple-600 mt-1"></span>}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Right Column - Conversation View */}
					<div className={`flex-1 bg-white rounded-2xl shadow-lg border border-gray-100 p-0 flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] lg:h-full overflow-hidden ${isMobileView && !selectedMessage ? 'hidden' : 'flex'}`}>
						{selectedMessage ? (
							<div className="flex flex-col h-full">
								{/* Conversation Header */}
								<div className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 border-b border-gray-100 bg-[#faf8ff] flex-shrink-0">
									<div className="flex items-center gap-3">
										{isMobileView && (
											<button
												onClick={() => {
													setSelectedMessage(null);
												}}
												className="p-2 hover:bg-purple-50 rounded-lg transition"
											>
												<Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
											</button>
										)}
										<img 
											src={messageListData.find(m => m.id === selectedMessage)?.avatar} 
											alt="Avatar" 
											className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-purple-100"
										/>
										<div>
											<h3 className="font-semibold text-gray-900">
												{messageListData.find(m => m.id === selectedMessage)?.name}
											</h3>
											<p className="text-xs text-gray-400 tracking-wide">
												{isTyping ? 'Typing...' : 'Active now'}
											</p>
										</div>
									</div>
								</div>

								{/* Messages */}
								<div className="flex-1 py-4 sm:py-6 px-4 sm:px-6 space-y-2 custom-scrollbar bg-[#f9f9fc] overflow-y-auto">
									{messageListData.find(m => m.id === selectedMessage)?.conversation.map((msg, idx, arr) => (
										<div key={idx} className="flex flex-col items-center">
											<div className={`w-full flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
												<div
													className={`
														max-w-[70%] rounded-xl px-4 py-2 shadow 
														${msg.fromMe ? 'bg-gradient-to-l from-purple-600 to-purple-500 text-white self-end' : 'bg-white border border-gray-100 text-gray-800 self-start'}
													`}
													style={{
														borderTopRightRadius: msg.fromMe ? 8 : 24,
														borderTopLeftRadius: msg.fromMe ? 24 : 8
													}}
												>
													<p className="break-words">{msg.text}</p>
													<div className="flex items-center gap-2 mt-1">
														<span className={`text-[0.75rem] ${msg.fromMe ? 'text-purple-100' : 'text-gray-400'}`}>{msg.time}</span>
														{msg.fromMe && (
															<span className="text-xs opacity-70">
																<Icon icon="mdi:check-all" className="w-4 h-4" />
															</span>
														)}
													</div>
												</div>
											</div>
											{/* Only add the scroll "anchor" on the last message */}
											{idx === arr.length - 1 && (
												<div ref={conversationEndRef} />
											)}
										</div>
									))}
								</div>

								{/* Quick Reply Templates */}
								<div className="px-4 sm:px-6 pt-2 pb-1 border-t bg-white flex gap-2 overflow-x-auto flex-shrink-0">
									{[
										"Thank you for your order!",
										"Your order is being processed",
										"How can I help you?",
										"Your order has been shipped"
									].map((text, idx) => (
										<button
											key={idx}
											className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full whitespace-nowrap hover:bg-purple-50 border transition"
											onClick={() => setNewMessageText(text)}
										>
											{text}
										</button>
									))}
								</div>

								{/* Message Input */}
								<form
									className="flex gap-2 px-4 sm:px-6 pb-3 pt-2 bg-white flex-shrink-0"
									onSubmit={e => {
										e.preventDefault();
										handleSendMessage();
									}}
								>
									<button
										type="button"
										className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
										title="Attach file"
									>
										<Icon icon="mdi:paperclip" className="w-5 h-5 sm:w-6 sm:h-6" />
									</button>
									<input
										type="text"
										placeholder="Type a message..."
										className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-200"
										value={newMessageText}
										onChange={(e) => {
											setNewMessageText(e.target.value);
											setIsTyping(true);
											setTimeout(() => setIsTyping(false), 1000);
										}}
									/>
									<button
										type="submit"
										className="px-4 sm:px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm transition font-medium"
									>
										Send
									</button>
								</form>
							</div>
						) : (
							<div className="h-full flex items-center justify-center text-gray-400">
								<div className="text-center px-4">
									<Icon icon="mdi:message-outline" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" />
									<p className="text-base sm:text-lg font-semibold text-gray-500">Select a conversation to view</p>
									<p className="text-xs sm:text-sm mt-2 text-gray-400">Choose from your customer support conversations</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</main>
			<style>{`
				.custom-scrollbar::-webkit-scrollbar {
					width: 8px;
					background: #f9f9fc;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: #e4e2f8;
					border-radius: 6px;
				}
				.custom-scrollbar:hover::-webkit-scrollbar-thumb {
					background: #cfcdf2;
				}
				@media (max-width: 1024px) {
					.custom-scrollbar::-webkit-scrollbar {
						width: 4px;
					}
				}
			`}</style>
		</div>
	);
}

export default Messages;