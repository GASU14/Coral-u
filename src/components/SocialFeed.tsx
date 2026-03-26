import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, MessageSquare, Hash, Users, Search, 
  Plus, MoreVertical, Heart, Share2, Filter,
  ChevronRight, ChevronLeft, Gamepad2, Globe,
  Image as ImageIcon, X, ArrowLeft, MessageCircle,
  Tag, Calendar, User as UserIcon
} from 'lucide-react';
import { 
  collection, query, orderBy, onSnapshot, 
  addDoc, serverTimestamp, where, doc, getDoc, updateDoc,
  arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import gamesData from '../../game.json';

interface Game {
  Title: string;
  Icon: string;
  Categories: string[];
}

interface Thread {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  gameTitle: string;
  content: string;
  tags: string[];
  createdAt: any;
  likes: string[];
  images?: string[];
}

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto: string;
  createdAt: any;
  image?: string;
}

interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto: string;
  createdAt: any;
  image?: string;
}

export default function SocialFeed() {
  const [activeTab, setActiveTab] = useState<'threads' | 'chat'>('threads');
  const [selectedGame, setSelectedGame] = useState<string>('All');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadTags, setNewThreadTags] = useState('');
  const [newThreadImages, setNewThreadImages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newMessageImage, setNewMessageImage] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadComments, setThreadComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newCommentImage, setNewCommentImage] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const games = useMemo(() => {
    const list = gamesData as Game[];
    return [{ Title: 'All', Icon: '' }, ...list];
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    threads.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [threads]);

  const filteredTags = useMemo(() => {
    if (!tagSearch) return [];
    return allTags.filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase())).slice(0, 5);
  }, [tagSearch, allTags]);

  // Fetch Threads
  useEffect(() => {
    const q = selectedGame === 'All' 
      ? query(collection(db, 'threads'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'threads'), where('gameTitle', '==', selectedGame), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Thread));
      setThreads(docs);
    });

    return () => unsubscribe();
  }, [selectedGame]);

  // Fetch Chat Messages
  useEffect(() => {
    const q = query(
      collection(db, 'messages'), 
      where('gameTitle', '==', selectedGame),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(docs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [selectedGame]);

  // Fetch User Profiles for caching
  useEffect(() => {
    const allUserIds = new Set<string>();
    threads.forEach(t => allUserIds.add(t.authorId));
    messages.forEach(m => allUserIds.add(m.userId));
    threadComments.forEach(c => allUserIds.add(c.userId));

    allUserIds.forEach(async (uid) => {
      if (!userProfiles[uid]) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setUserProfiles(prev => ({ ...prev, [uid]: userDoc.data() }));
        }
      }
    });
  }, [threads, messages, threadComments]);

  // Fetch Thread Comments
  useEffect(() => {
    if (!selectedThreadId) return;
    const q = query(collection(db, `threads/${selectedThreadId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setThreadComments(docs);
    });
    return () => unsubscribe();
  }, [selectedThreadId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'thread' | 'chat' | 'comment') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'thread') setNewThreadImages(prev => [...prev, base64]);
        else if (type === 'chat') setNewMessageImage(base64);
        else if (type === 'comment') setNewCommentImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newThreadContent.trim() || !newThreadTitle.trim()) return;

    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userDoc.data();

    await addDoc(collection(db, 'threads'), {
      title: newThreadTitle,
      content: newThreadContent,
      authorId: auth.currentUser.uid,
      authorName: userData?.username || 'Anonymous',
      authorPhoto: userData?.photoURL || '',
      gameTitle: selectedGame === 'All' ? 'General' : selectedGame,
      tags: newThreadTags.split(/[\s,]+/).filter(t => t.startsWith('#')).map(t => t.slice(1)),
      createdAt: serverTimestamp(),
      likes: [],
      images: newThreadImages
    });

    setNewThreadTitle('');
    setNewThreadContent('');
    setNewThreadTags('');
    setNewThreadImages([]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || (!newMessage.trim() && !newMessageImage)) return;

    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userDoc.data();

    await addDoc(collection(db, 'messages'), {
      text: newMessage,
      userId: auth.currentUser.uid,
      userName: userData?.username || 'Anonymous',
      userPhoto: userData?.photoURL || '',
      gameTitle: selectedGame,
      createdAt: serverTimestamp(),
      image: newMessageImage
    });

    setNewMessage('');
    setNewMessageImage(null);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedThreadId || (!newComment.trim() && !newCommentImage)) return;

    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userDoc.data();

    await addDoc(collection(db, `threads/${selectedThreadId}/comments`), {
      text: newComment,
      userId: auth.currentUser.uid,
      userName: userData?.username || 'Anonymous',
      userPhoto: userData?.photoURL || '',
      createdAt: serverTimestamp(),
      image: newCommentImage
    });

    setNewComment('');
    setNewCommentImage(null);
  };

  const handleLikeThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    const threadRef = doc(db, 'threads', threadId);
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    const isLiked = thread.likes?.includes(auth.currentUser.uid);
    await updateDoc(threadRef, {
      likes: isLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
    });
  };

  const selectedThread = useMemo(() => threads.find(t => t.id === selectedThreadId), [threads, selectedThreadId]);

  const filteredGames = useMemo(() => {
    if (!channelSearch) return games;
    return games.filter(g => g.Title.toLowerCase().includes(channelSearch.toLowerCase()));
  }, [games, channelSearch]);

  const filteredThreads = useMemo(() => {
    let result = threads;
    if (threadSearch) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(threadSearch.toLowerCase()) || 
        t.content.toLowerCase().includes(threadSearch.toLowerCase())
      );
    }
    if (selectedTag) {
      result = result.filter(t => t.tags?.includes(selectedTag));
    }
    return result;
  }, [threads, threadSearch, selectedTag]);

  const UserDisplay = ({ userId, defaultName, defaultPhoto, size = 'sm', showName = true }: { userId: string, defaultName: string, defaultPhoto: string, size?: 'sm' | 'md' | 'lg', showName?: boolean }) => {
    const profile = userProfiles[userId];
    const name = profile?.username || defaultName;
    const photo = profile?.photoURL || defaultPhoto;
    
    const sizeClasses = {
      sm: 'w-8 h-8 rounded-lg',
      md: 'w-10 h-10 rounded-xl',
      lg: 'w-14 h-14 rounded-2xl'
    };

    return (
      <div className="flex items-center gap-3">
        <div className={`${sizeClasses[size]} bg-[var(--bg-card)] overflow-hidden border border-white/5 shadow-md flex-shrink-0`}>
          <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        {showName && <span className={`font-bold text-white ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>{name}</span>}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-[var(--bg)] text-[var(--fg)] overflow-hidden">
      {/* Left Sidebar: Games List */}
      <motion.div 
        animate={{ width: isSidebarCollapsed ? 80 : 240 }}
        className="bg-[var(--bg-surface)] border-r border-white/5 flex flex-col transition-all overflow-hidden z-20"
      >
        <div className="p-4 border-b border-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && <span className="font-bold text-xs uppercase tracking-widest opacity-50">Channels</span>}
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
          {!isSidebarCollapsed && (
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--fg-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input 
                type="text" 
                placeholder="Search channels..." 
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="w-full bg-[var(--bg-card)] border-none rounded-xl py-2 pl-9 pr-4 text-[10px] focus:ring-2 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--fg-muted)]/50 text-[var(--fg)]"
              />
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {filteredGames.map(game => (
            <button
              key={game.Title}
              onClick={() => {
                setSelectedGame(game.Title);
                setSelectedThreadId(null);
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group relative ${
                selectedGame === game.Title ? 'bg-[var(--accent)] text-white shadow-lg shadow-blue-500/20' : 'hover:bg-white/5 text-[var(--fg-muted)]'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/5">
                {game.Icon ? (
                  <img src={game.Icon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
              </div>
              {!isSidebarCollapsed && <span className="text-sm font-semibold text-left leading-tight break-words flex-1">{game.Title}</span>}
              {selectedGame === game.Title && !isSidebarCollapsed && (
                <motion.div layoutId="active-channel" className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Tabs */}
        <div className="p-4 bg-[var(--bg-surface)] border-b border-white/5 flex items-center gap-4 z-10 shadow-sm">
          <button 
            onClick={() => {
              setActiveTab('threads');
              setSelectedThreadId(null);
            }}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'threads' && !selectedThreadId ? 'bg-[var(--bg-card)] text-white ring-1 ring-white/10' : 'text-[var(--fg-muted)] hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Threads
          </button>
          <button 
            onClick={() => {
              setActiveTab('chat');
              setSelectedThreadId(null);
            }}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'chat' ? 'bg-[var(--bg-card)] text-white ring-1 ring-white/10' : 'text-[var(--fg-muted)] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Chat
          </button>
          
          <div className="ml-auto flex items-center gap-2 text-xs font-bold text-[var(--fg-muted)] bg-[var(--bg-card)] px-3 py-1.5 rounded-full border border-white/5">
             <Hash className="w-3 h-3 text-[var(--accent)]" /> {selectedGame}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-[var(--bg)]/50 relative">
          <AnimatePresence mode="wait">
            {selectedThreadId && selectedThread ? (
              <motion.div 
                key="thread-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-50 bg-[var(--bg)] flex flex-col"
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[var(--bg-surface)]">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedThreadId(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                    >
                      <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-white leading-none truncate max-w-md">{selectedThread.title}</h2>
                      <p className="text-xs text-[var(--fg-muted)] mt-1">Discussion in {selectedThread.gameTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <UserDisplay 
                      userId={selectedThread.authorId} 
                      defaultName={selectedThread.authorName} 
                      defaultPhoto={selectedThread.authorPhoto} 
                      size="sm"
                    />
                    <button onClick={() => setSelectedThreadId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-hide">
                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-[var(--bg-surface)] rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                        <MessageSquare className="w-64 h-64" />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                          <UserDisplay 
                            userId={selectedThread.authorId} 
                            defaultName={selectedThread.authorName} 
                            defaultPhoto={selectedThread.authorPhoto} 
                            size="lg"
                            showName={false}
                          />
                          <div>
                            <div className="text-lg font-black text-white flex items-center gap-2">
                              {userProfiles[selectedThread.authorId]?.username || selectedThread.authorName}
                              <span className="text-[10px] bg-[var(--accent)] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Author</span>
                            </div>
                            <div className="text-xs text-[var(--fg-muted)] flex items-center gap-2 font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{selectedThread.createdAt?.toDate().toLocaleDateString()}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10" />
                              <span className="text-[var(--accent)] font-black uppercase tracking-tighter">{selectedThread.gameTitle}</span>
                            </div>
                          </div>
                        </div>

                        <h1 className="text-4xl font-black text-white mb-6 leading-[1.1] tracking-tight">{selectedThread.title}</h1>
                        <div className="text-lg text-[var(--fg)]/90 leading-relaxed mb-10 whitespace-pre-wrap font-medium">{selectedThread.content}</div>

                        {selectedThread.images && selectedThread.images.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                            {selectedThread.images.map((img, i) => (
                              <motion.div 
                                key={i} 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group relative aspect-video"
                              >
                                <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </motion.div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mb-10">
                          {selectedThread.tags?.map(tag => (
                            <span key={tag} className="px-5 py-2 bg-[var(--bg-card)] rounded-2xl text-xs font-black text-[var(--accent)] border border-[var(--accent)]/20 shadow-sm">#{tag}</span>
                          ))}
                        </div>

                        <div className="flex items-center gap-10 border-t border-white/5 pt-8">
                          <button 
                            onClick={(e) => handleLikeThread(selectedThread.id, e)}
                            className={`flex items-center gap-3 transition-all hover:scale-110 group ${selectedThread.likes?.includes(auth.currentUser?.uid || '') ? 'text-red-500' : 'text-[var(--fg-muted)] hover:text-red-400'}`}
                          >
                            <Heart className={`w-7 h-7 ${selectedThread.likes?.includes(auth.currentUser?.uid || '') ? 'fill-current' : 'group-hover:fill-red-500/20'}`} />
                            <span className="text-lg font-black">{selectedThread.likes?.length || 0}</span>
                          </button>
                          <div className="flex items-center gap-3 text-[var(--fg-muted)]">
                            <MessageCircle className="w-7 h-7" />
                            <span className="text-lg font-black">{threadComments.length} Comments</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comments Section */}
                    <div className="space-y-6 pb-20">
                      <div className="flex items-center justify-between px-4">
                        <h3 className="text-2xl font-black text-white">Discussion</h3>
                        <span className="text-xs font-bold text-[var(--fg-muted)] bg-[var(--bg-card)] px-3 py-1 rounded-full border border-white/5">{threadComments.length} replies</span>
                      </div>
                      
                      {/* Add Comment */}
                      <div className="bg-[var(--bg-surface)] rounded-[2rem] p-8 border border-white/5 shadow-2xl">
                        <form onSubmit={handleAddComment} className="space-y-6">
                          <div className="relative group">
                            <textarea 
                              placeholder="Share your thoughts..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="w-full bg-[var(--bg-card)] border-none rounded-3xl py-5 px-6 text-base focus:ring-2 focus:ring-[var(--accent)] text-white h-32 resize-none shadow-inner placeholder:text-[var(--fg-muted)]/30"
                            />
                            <button 
                              type="button"
                              onClick={() => commentFileInputRef.current?.click()}
                              className="absolute right-5 bottom-5 p-3 bg-[var(--bg-surface)] text-[var(--fg-muted)] hover:text-[var(--accent)] rounded-2xl transition-all hover:scale-110 shadow-lg border border-white/5"
                            >
                              <ImageIcon className="w-6 h-6" />
                            </button>
                          </div>

                          {newCommentImage && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative w-32 h-32 rounded-3xl overflow-hidden border-2 border-[var(--accent)] group shadow-2xl"
                            >
                              <img src={newCommentImage} alt="" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setNewCommentImage(null)}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </motion.div>
                          )}

                          <div className="flex justify-end">
                            <button type="submit" className="bg-[var(--accent)] text-white px-10 py-3.5 rounded-2xl text-base font-black shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all">
                              Post Reply
                            </button>
                          </div>
                        </form>
                        <input type="file" ref={commentFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'comment')} />
                      </div>

                      {/* Comments List */}
                      <div className="space-y-4">
                        {threadComments.map((comment, i) => (
                          <motion.div 
                            key={comment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-[var(--bg-surface)] rounded-[2rem] p-6 md:p-8 border border-white/5 flex gap-6 hover:border-white/10 transition-colors"
                          >
                            <UserDisplay 
                              userId={comment.userId} 
                              defaultName={comment.userName} 
                              defaultPhoto={comment.userPhoto} 
                              size="md"
                              showName={false}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-base font-black text-white">{userProfiles[comment.userId]?.username || comment.userName}</span>
                                <span className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest">{comment.createdAt?.toDate().toLocaleDateString()}</span>
                              </div>
                              <p className="text-base text-[var(--fg)]/80 leading-relaxed mb-4 font-medium">{comment.text}</p>
                              {comment.image && (
                                <div className="max-w-xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                                  <img src={comment.image} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'threads' ? (
              <motion.div 
                key="threads-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                {/* Create Thread Form */}
                <div className="bg-[var(--bg-surface)] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[var(--accent)]" /> Start a New Discussion
                  </h3>
                  <form onSubmit={handleCreateThread} className="space-y-5">
                    <input 
                      type="text" 
                      placeholder="Give your thread a catchy title..."
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border-none rounded-2xl py-4 px-6 text-base font-bold focus:ring-2 focus:ring-[var(--accent)] text-white placeholder:text-[var(--fg-muted)]/30 shadow-inner"
                    />
                    <div className="relative">
                      <textarea 
                        placeholder="What would you like to talk about?"
                        value={newThreadContent}
                        onChange={(e) => setNewThreadContent(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border-none rounded-2xl py-4 px-6 text-sm focus:ring-2 focus:ring-[var(--accent)] text-white h-32 resize-none shadow-inner"
                      />
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute right-4 bottom-4 p-2.5 bg-[var(--bg-surface)] text-[var(--fg-muted)] hover:text-[var(--accent)] rounded-xl transition-all hover:scale-110 shadow-lg"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {newThreadImages.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {newThreadImages.map((img, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 group">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setNewThreadImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="relative flex-1 w-full">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
                        <input 
                          type="text" 
                          placeholder="Add tags (e.g. #gameplay, #help)"
                          value={newThreadTags}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewThreadTags(val);
                            
                            // Find the last tag being typed (starting with # or just typing)
                            const words = val.split(/[\s,]+/);
                            const lastWord = words[words.length - 1];
                            
                            if (lastWord.length > 0) {
                              setTagSearch(lastWord.startsWith('#') ? lastWord.slice(1) : lastWord);
                              setShowTagSuggestions(true);
                            } else {
                              setShowTagSuggestions(false);
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                          className="w-full bg-[var(--bg-card)] border-none rounded-2xl py-3 pl-12 pr-4 text-xs focus:ring-2 focus:ring-[var(--accent)] text-white shadow-inner"
                        />
                        <AnimatePresence>
                          {showTagSuggestions && filteredTags.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute bottom-full mb-2 left-0 right-0 bg-[var(--bg-surface)] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl"
                            >
                              {filteredTags.map(tag => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    const words = newThreadTags.split(/[\s,]+/);
                                    words.pop();
                                    const newVal = [...words, `#${tag}`].join(' ') + ' ';
                                    setNewThreadTags(newVal);
                                    setShowTagSuggestions(false);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-[var(--accent)] hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-between group"
                                >
                                  #{tag}
                                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button type="submit" className="w-full md:w-auto bg-[var(--accent)] text-white px-10 py-3 rounded-2xl text-base font-black shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all">
                        Post Thread
                      </button>
                    </div>
                  </form>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'thread')} />
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
                    <input 
                      type="text" 
                      placeholder="Search threads..."
                      value={threadSearch}
                      onChange={(e) => setThreadSearch(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[var(--accent)] text-white"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    <button 
                      onClick={() => setSelectedTag(null)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${!selectedTag ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-surface)] text-[var(--fg-muted)] border border-white/5'}`}
                    >
                      All Tags
                    </button>
                    {allTags.slice(0, 10).map(tag => (
                      <button 
                        key={tag}
                        onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedTag === tag ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-surface)] text-[var(--fg-muted)] border border-white/5'}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Threads List */}
                <div className="space-y-6">
                  {filteredThreads.map(thread => (
                    <motion.div 
                      key={thread.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className="bg-[var(--bg-surface)] rounded-[2rem] p-6 border border-white/5 hover:border-[var(--accent)]/30 transition-all shadow-lg cursor-pointer group hover:shadow-2xl hover:shadow-[var(--accent)]/5"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <UserDisplay 
                          userId={thread.authorId} 
                          defaultName={thread.authorName} 
                          defaultPhoto={thread.authorPhoto} 
                          size="md"
                          showName={false}
                        />
                        <div>
                          <div className="text-sm font-bold text-white group-hover:text-[var(--accent)] transition-colors">{userProfiles[thread.authorId]?.username || thread.authorName}</div>
                          <div className="text-[10px] text-[var(--fg-muted)] flex items-center gap-2">
                            <span>{thread.createdAt?.toDate().toLocaleDateString()}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[var(--accent)] font-bold">{thread.gameTitle}</span>
                          </div>
                        </div>
                        <div className="ml-auto">
                           <MoreVertical className="w-4 h-4 text-[var(--fg-muted)]" />
                        </div>
                      </div>
                      <h4 className="text-xl font-black text-white mb-3 group-hover:translate-x-1 transition-transform">{thread.title}</h4>
                      <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-4 line-clamp-3">{thread.content}</p>
                      
                      {thread.images && thread.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-4 h-32">
                          {thread.images.slice(0, 2).map((img, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden border border-white/5 relative">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              {i === 1 && thread.images!.length > 2 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-sm">
                                  +{thread.images!.length - 2} more
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mb-6">
                        {thread.tags?.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-[var(--bg-card)] rounded-lg text-[10px] font-bold text-[var(--accent)] border border-white/5">#{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-6 border-t border-white/5 pt-4">
                        <button 
                          onClick={(e) => handleLikeThread(thread.id, e)}
                          className={`flex items-center gap-2 transition-colors ${thread.likes?.includes(auth.currentUser?.uid || '') ? 'text-red-500' : 'text-[var(--fg-muted)] hover:text-red-400'}`}
                        >
                          <Heart className={`w-4 h-4 ${thread.likes?.includes(auth.currentUser?.uid || '') ? 'fill-current' : ''}`} />
                          <span className="text-xs font-bold">{thread.likes?.length || 0}</span>
                        </button>
                        <button className="flex items-center gap-2 text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs font-bold">Discuss</span>
                        </button>
                        <button className="flex items-center gap-2 text-[var(--fg-muted)] hover:text-white transition-colors ml-auto">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="chat-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col max-w-5xl mx-auto"
              >
                {/* Chat Messages */}
                <div className="flex-1 space-y-6 mb-6 overflow-y-auto pr-4 scrollbar-hide">
                  {messages.map((msg, idx) => {
                    const isMe = msg.userId === auth.currentUser?.uid;
                    const showAvatar = idx === 0 || messages[idx-1].userId !== msg.userId;
                    
                    return (
                      <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <UserDisplay 
                          userId={msg.userId} 
                          defaultName={msg.userName} 
                          defaultPhoto={msg.userPhoto} 
                          size="md"
                          showName={false}
                        />
                        <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {showAvatar && (
                            <div className="flex items-center gap-2 mb-1.5 px-1">
                              <span className="text-xs font-black text-white">{userProfiles[msg.userId]?.username || msg.userName}</span>
                              <span className="text-[9px] text-[var(--fg-muted)] font-bold">{msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                          <div className={`p-4 rounded-[1.5rem] text-sm shadow-lg leading-relaxed ${
                            isMe 
                              ? 'bg-[var(--accent)] text-white rounded-tr-none' 
                              : 'bg-[var(--bg-surface)] text-[var(--fg)] rounded-tl-none border border-white/5'
                          }`}>
                            {msg.text}
                            {msg.image && (
                              <div className="mt-3 rounded-xl overflow-hidden border border-white/10 shadow-inner">
                                <img src={msg.image} alt="" className="max-w-full h-auto object-contain" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="bg-[var(--bg-surface)] rounded-[2rem] p-4 border border-white/5 shadow-2xl">
                  <form onSubmit={handleSendMessage} className="relative flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea 
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e as any);
                          }
                        }}
                        className="w-full bg-[var(--bg-card)] border-none rounded-2xl py-4 pl-6 pr-14 text-sm focus:ring-2 focus:ring-[var(--accent)] text-white h-14 resize-none shadow-inner"
                      />
                      <button 
                        type="button"
                        onClick={() => chatFileInputRef.current?.click()}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <button type="submit" className="p-4 bg-[var(--accent)] text-white rounded-2xl shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all">
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                  
                  {newMessageImage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-[var(--accent)] group"
                    >
                      <img src={newMessageImage} alt="" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setNewMessageImage(null)}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}
                  <input type="file" ref={chatFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'chat')} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
