import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, Play, Gamepad2, Shuffle, ArrowUp, Trophy, 
  RotateCcw, Maximize, Menu, Settings, History, Layout, 
  ChevronRight, Sparkles, Home, Grid, Info, ChevronLeft,
  Lock, Filter, MousePointer2, Layers, RefreshCw, Pause, User, Users, MessageSquare, ExternalLink, ShieldCheck
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import gamesData from '../game.json';
import { GameCard } from './components/GameCard';
import Calculator from './components/Calculator';
const SocialFeed = lazy(() => import('./components/SocialFeed'));
const Auth = lazy(() => import('./components/Auth'));
const ProfileSettings = lazy(() => import('./components/ProfileSettings'));

interface Game {
  Title: string;
  Icon: string;
  IFrame: string;
  Categories: string[];
  badge: string;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return new URLSearchParams(window.location.search).get('unlocked') === 'true';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLaunched, setIsLaunched] = useState(() => {
    // Skip launcher if explicitly in cloaked mode OR if direct access is requested
    const params = new URLSearchParams(window.location.search);
    return params.get('cloaked') === 'true' || params.get('direct') === 'true';
  });

  const handleLaunch = () => {
    // Construct cloaked URL
    const url = new URL(window.location.href);
    url.searchParams.set('cloaked', 'true');
    
    const win = window.open('about:blank', '_blank');
    if (win) {
      win.document.title = 'Coral';
      const doc = win.document;
      const body = doc.body;
      body.style.margin = '0';
      body.style.height = '100vh';
      body.style.overflow = 'hidden';
      body.style.backgroundColor = '#000';
      
      const iframe = doc.createElement('iframe');
      iframe.style.border = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.margin = '0';
      iframe.src = url.toString();
      iframe.allow = "autoplay; fullscreen; keyboard; pointer-lock; gamepad; camera; microphone; geolocation";
      // No sandbox on the main cloaked iframe to be as permissive as possible
      
      body.appendChild(iframe);
      // We stay on the launcher in the original tab, 
      // or we can show a "Launched" message. 
      // For now, let's keep the original tab as is (launcher visible).
    } else {
      // Fallback if popup blocked: just show the app in current tab
      setIsLaunched(true);
    }
  };
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [visibleGamesCount, setVisibleGamesCount] = useState(24);
  const [showSocial, setShowSocial] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('coral_theme') || 'default');
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, show: boolean }>({ x: 0, y: 0, show: false });
  const [isPaused, setIsPaused] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Context Menu listeners
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, show: true });
    };
    const handleClick = () => {
      setContextMenu(prev => ({ ...prev, show: false }));
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  // Reset pagination on category change
  useEffect(() => {
    setVisibleGamesCount(24);
  }, [selectedCategories]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(() => {
    try {
      const saved = localStorage.getItem('nylo_active_game');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isPlayerOpen, setIsPlayerOpen] = useState(() => {
    return localStorage.getItem('nylo_player_open') === 'true';
  });
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('nylo_settings');
      return saved ? JSON.parse(saved) : {
        autoFullscreen: false,
        enableTabs: false,
        cleanMode: false
      };
    } catch {
      return { autoFullscreen: false, enableTabs: false, cleanMode: false };
    }
  });
  const [openGames, setOpenGames] = useState<Game[]>([]);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'settings' | 'tabs'>('main');
  const [showUpdateLog, setShowUpdateLog] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(() => Math.floor(Date.now() / (6 * 60 * 60 * 1000)));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  // Preconnect to game domain for faster loading
  useEffect(() => {
    if (selectedGame) {
      try {
        const url = new URL(selectedGame.IFrame);
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url.origin;
        document.head.appendChild(link);
        return () => {
          document.head.removeChild(link);
        };
      } catch (e) {
        console.error('Invalid game URL for preconnect', e);
      }
    }
  }, [selectedGame]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('nylo_settings', JSON.stringify(settings));
  }, [settings]);

  // Persist active game state
  useEffect(() => {
    if (selectedGame) {
      localStorage.setItem('nylo_active_game', JSON.stringify(selectedGame));
    } else {
      localStorage.removeItem('nylo_active_game');
    }
    localStorage.setItem('nylo_player_open', isPlayerOpen.toString());
  }, [selectedGame, isPlayerOpen]);

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Persist theme
  useEffect(() => {
    localStorage.setItem('coral_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Game Data Logic
  const games = useMemo(() => {
    return [...(gamesData as Game[])].sort((a, b) => a.Title.localeCompare(b.Title));
  }, []);

  const rotationIntervalMs = 3 * 60 * 60 * 1000; // 3 hours
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const nextPeriod = (Math.floor(now / rotationIntervalMs) + 1) * rotationIntervalMs;
      const diff = nextPeriod - now;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      
      const newPeriod = Math.floor(now / rotationIntervalMs);
      setCurrentPeriod(prev => (prev !== newPeriod ? newPeriod : prev));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  // ... (featuredGames memo uses currentPeriod)

  const featuredGames = useMemo(() => {
    if (games.length === 0) return [];
    let seed = currentPeriod;
    const shuffled = [...games];
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 5);
  }, [games, currentPeriod]);

  const categories = useMemo(() => {
    const allCats = games.flatMap(g => g.Categories || []);
    return Array.from(new Set(allCats.filter(c => typeof c === 'string' && c.trim() !== ''))).sort();
  }, [games]);

  const [preferenceFilter, setPreferenceFilter] = useState<Game | null>(null);

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.Title.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      
      // Multi-category match (must match ALL selected categories)
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.every(cat => game.Categories.includes(cat));

      // Preference filter: finds games with at least 3 matching categories
      let matchesPreference = true;
      if (preferenceFilter) {
        const commonCats = game.Categories.filter(cat => preferenceFilter.Categories.includes(cat));
        matchesPreference = commonCats.length >= 3 && game.Title !== preferenceFilter.Title;
      }

      return matchesSearch && matchesCategory && matchesPreference;
    });
  }, [games, debouncedSearchQuery, selectedCategories, preferenceFilter]);

  const visibleGames = useMemo(() => {
    return filteredGames.slice(0, visibleGamesCount);
  }, [filteredGames, visibleGamesCount]);

  // Infinite Scroll logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleGamesCount < filteredGames.length) {
          setVisibleGamesCount(prev => prev + 24);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [visibleGamesCount, filteredGames.length]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(deferredSearchQuery);
      setVisibleGamesCount(24); // Reset pagination on search
    }, 200);
    return () => clearTimeout(timer);
  }, [deferredSearchQuery]);

  const similarGames = useMemo(() => {
    if (!selectedGame) return [];
    return games.filter(g => 
      g.Title !== selectedGame.Title && 
      g.Categories.some(cat => selectedGame.Categories.includes(cat))
    ).slice(0, 12);
  }, [selectedGame, games]);

  const playerFilteredGames = useMemo(() => {
    if (!playerSearchQuery) return similarGames;
    return games.filter(g => 
      g.Title.toLowerCase().includes(playerSearchQuery.toLowerCase())
    ).slice(0, 12);
  }, [playerSearchQuery, similarGames, games]);

  // Handlers
  const handleGameSelect = useCallback((game: Game) => {
    setSelectedGame(game);
    setIsPlayerOpen(true);
    
    if (settings.enableTabs) {
      setOpenGames(prev => {
        if (prev.find(g => g.Title === game.Title)) return prev;
        return [...prev, game];
      });
    } else {
      setOpenGames([game]);
    }

    if (settings.autoFullscreen) {
      setTimeout(() => toggleFullscreen(), 500);
    }
  }, [settings]);

  const handleRandomGame = useCallback(() => {
    const randomIdx = Math.floor(Math.random() * games.length);
    handleGameSelect(games[randomIdx]);
  }, [games, handleGameSelect]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const closePlayer = useCallback(() => {
    setIsPlayerOpen(false);
    if (!settings.enableTabs) {
      setOpenGames([]);
    }
  }, [settings.enableTabs]);

  const closeTab = useCallback((gameTitle: string) => {
    setOpenGames(prev => {
      const filtered = prev.filter(g => g.Title !== gameTitle);
      if (selectedGame?.Title === gameTitle) {
        setSelectedGame(filtered.length > 0 ? filtered[filtered.length - 1] : null);
        if (filtered.length === 0) setIsPlayerOpen(false);
      }
      return filtered;
    });
  }, [selectedGame]);

  const refreshIframe = useCallback(() => {
    if (selectedGame) {
      setRefreshKeys(prev => ({
        ...prev,
        [selectedGame.Title]: (prev[selectedGame.Title] || 0) + 1
      }));
    }
  }, [selectedGame]);

  const toggleFullscreen = useCallback(() => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  }, []);

  const updateLogs = [
    { 
      version: 'Release', 
      date: '2026-03-11', 
      sections: [
        {
          title: 'Status',
          changes: ['Official Release'],
          games: [] as string[]
        }
      ]
    }
  ];

  const handleUnlock = () => {
    // Do nothing locally to ensure the main tab stays as a calculator
  };

  if (false) { // Hidden for now as requested
    return <Calculator onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-sans selection:bg-[var(--accent)] selection:text-white pb-20 md:pb-0">
      {/* Header */}
      {/* Launcher Splash Screen */}
      <AnimatePresence>
        {!isLaunched && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[var(--bg)] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Soft Ambient Glow */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-[var(--accent)] rounded-full blur-[160px] opacity-20" />
            </div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center"
            >
              <h1 className="text-8xl font-black text-white tracking-tighter mb-16 italic">CORAL</h1>

              <button
                onClick={handleLaunch}
                className="px-16 py-5 bg-white text-black rounded-[2rem] font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl hover:shadow-white/10"
              >
                ENTER
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header 
        layout
        className={`sticky top-0 z-40 glass px-6 transition-all duration-500 ${isPlayerOpen ? 'opacity-0 pointer-events-none -translate-y-full' : 'opacity-100 translate-y-0'}`}
      >
        <motion.div layout className="max-w-7xl mx-auto flex flex-col">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-6">
              <motion.div layout className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
                <h1 className="text-2xl font-black tracking-tighter text-[var(--accent)]">
                  CORAL
                </h1>
              </motion.div>
            </div>
            
            <div className="flex items-center gap-3">
               {user ? (
                 <motion.button 
                   layout
                   onClick={() => setShowProfileSettings(true)}
                   className="p-1.5 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] transition-all border border-white/5 overflow-hidden"
                 >
                   <div className="w-8 h-8 rounded-xl overflow-hidden bg-[var(--bg-card)]">
                     {user.photoURL ? (
                       <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                     ) : (
                       <User className="w-full h-full p-2 text-[var(--fg-muted)]" />
                     )}
                   </div>
                 </motion.button>
               ) : (
                 <motion.button 
                   layout
                   onClick={() => {}} // WIP
                   className="p-2.5 rounded-2xl bg-[var(--bg-surface)] text-[var(--fg-muted)] cursor-not-allowed transition-all border border-white/5 relative group"
                 >
                   <User className="w-5 h-5 opacity-50" />
                   <div className="absolute -top-1 -right-1 bg-amber-500 text-[8px] font-black px-1 rounded-full text-black">WIP</div>
                 </motion.button>
               )}

               {/* Multi-Category Filter Button */}
               <motion.button 
                 layout
                 onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                 className={`p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center gap-2 ${
                   selectedCategories.length > 0 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-surface)] text-[var(--fg)]'
                 }`}
                 title="Multi-Category Filter"
               >
                  <Filter className="w-5 h-5" />
                  {selectedCategories.length > 0 && <span className="text-xs font-bold">{selectedCategories.length}</span>}
               </motion.button>

               {/* Search Bar - Desktop */}
               <motion.div layout className="relative hidden md:block group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search games..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[var(--bg-surface)] border-none rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[var(--accent)] w-64 transition-all placeholder:text-[var(--fg-muted)]/50 text-[var(--fg)]"
                  />
               </motion.div>
               
               <motion.button 
                 layout
                 onClick={() => setIsSideMenuOpen(true)} 
                 className="p-3 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--fg)] transition-all hover:scale-105 active:scale-95 shadow-sm"
               >
                  <Menu className="w-5 h-5" />
               </motion.button>
            </div>
          </div>

          {/* Multi-Select Dropdown */}
          <AnimatePresence>
            {isMultiSelectOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-[var(--bg-surface)] rounded-3xl shadow-2xl border border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategories(prev => 
                            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                          );
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                          selectedCategories.includes(cat)
                            ? 'bg-[var(--accent)] text-white shadow-md'
                            : 'bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <button 
                      onClick={() => setSelectedCategories([])}
                      className="text-xs text-[var(--fg-muted)] hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear All
                    </button>
                    <button 
                      onClick={() => setIsMultiSelectOpen(false)}
                      className="px-6 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Mobile Search Bar */}
          <motion.div layout className="md:hidden mt-4 pb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]" />
              <input 
                type="text" 
                placeholder="Search games..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-surface)] border-none rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--fg-muted)]/50 text-[var(--fg)]"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.header>

      {/* Tabs UI - Moved under header and rotated */}
      {settings.enableTabs && openGames.length > 0 && !isPlayerOpen && (
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {openGames.map((game) => (
              <div
                key={`tab-${game.Title}`}
                onClick={() => handleGameSelect(game)}
                className={`flex items-center gap-3 px-4 py-2 rounded-b-xl transition-all min-w-[120px] max-w-[180px] group relative cursor-pointer border-b border-x ${
                  selectedGame?.Title === game.Title 
                    ? 'bg-[var(--bg-surface)] text-[var(--accent)] border-white/10' 
                    : 'bg-black/20 text-[var(--fg-muted)] hover:bg-black/40 border-transparent'
                }`}
              >
                <img src={game.Icon} className="w-4 h-4 rounded-sm object-cover" alt="" referrerPolicy="no-referrer" />
                <span className="text-[10px] font-bold leading-tight flex-1 text-left line-clamp-2">{game.Title}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(game.Title);
                  }}
                  className="p-1 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                {selectedGame?.Title === game.Title && (
                  <div className="absolute -top-[1px] left-0 right-0 h-[2px] bg-[var(--accent)] z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <main className={`max-w-7xl mx-auto px-6 mt-8 transition-opacity duration-300 ${isPlayerOpen ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : 'opacity-100'}`}>
         {/* Featured Games Carousel */}
         {!searchQuery && selectedCategories.length === 0 && !preferenceFilter && (
           <section className="mb-12">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <Sparkles className="w-5 h-5 text-[var(--accent)]" />
                 Featured
               </h2>
               <div className="text-xs font-mono text-[var(--fg-muted)] bg-[var(--bg-surface)] px-3 py-1 rounded-full">
                 {timeLeft}
               </div>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
               {featuredGames.map((game, idx) => (
                 <motion.div
                   key={`featured-${game.Title}`}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   onClick={() => handleGameSelect(game)}
                   className="group relative aspect-square cursor-pointer transition-all duration-500 hover:-translate-y-2"
                 >
                   <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:shadow-[var(--accent)]/20 transition-all duration-500">
                     <img
                       src={`${game.Icon}${game.Icon.includes('?') ? '&' : '?'}v=1`}
                       alt={game.Title}
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                       referrerPolicy="no-referrer"
                     />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center backdrop-blur-[12px] z-10">
                       <div className="w-12 h-12 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300 mb-4">
                         <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                       </div>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent group-hover:opacity-0 transition-opacity duration-300">
                       <h3 className="text-lg font-bold text-white leading-tight">{game.Title}</h3>
                     </div>
                   </div>
                 </motion.div>
               ))}
             </div>
           </section>
         )}

         {/* Game Grid */}
         <section className="mb-20">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <Grid className="w-5 h-5 text-[var(--accent)]" />
                 {searchQuery ? 'Search Results' : selectedCategories.length > 0 ? selectedCategories.join(', ') : 'Library'}
               </h2>
               <span className="text-sm text-[var(--fg-muted)] font-medium bg-[var(--bg-surface)] px-3 py-1 rounded-full">
                 {filteredGames.length} Games
               </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              <AnimatePresence mode="popLayout">
                {visibleGames.map((game, idx) => (
                  <GameCard 
                    key={game.Title} 
                    game={game} 
                    index={idx} 
                    onSelect={handleGameSelect} 
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
              {visibleGamesCount < filteredGames.length && (
                <div className="w-8 h-8 border-4 border-[var(--bg-card)] border-t-[var(--accent)] rounded-full animate-spin" />
              )}
            </div>

            {filteredGames.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--fg-muted)]">
                <div className="w-20 h-20 bg-[var(--bg-surface)] rounded-full flex items-center justify-center mb-6">
                  <Gamepad2 className="w-10 h-10 opacity-50" />
                </div>
                <p className="text-lg font-medium">No games found</p>
                <p className="text-sm opacity-60">Try searching for something else</p>
              </div>
            )}
         </section>
      </main>

      {/* Back to Top */}
      <AnimatePresence>
        {showScrollTop && !isPlayerOpen && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-30 p-4 bg-[var(--accent)] text-white rounded-2xl shadow-lg hover:shadow-blue-500/40 hover:scale-105 transition-all active:scale-95"
          >
            <ArrowUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Social Screen */}
      <AnimatePresence>
        {showSocial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowSocial(false)} />
            <div className="relative w-full h-full bg-[var(--bg-surface)] overflow-hidden shadow-2xl flex flex-col">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[var(--bg-card)]">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white leading-none">Social Feed</h2>
                    <p className="text-sm text-[var(--fg-muted)]">Beta v0.1</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSocial(false)}
                  className="p-3 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                {user ? (
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>}>
                    <SocialFeed />
                  </Suspense>
                ) : (
                  <div className="h-full flex items-center justify-center p-12">
                    <Suspense fallback={<div className="p-10 bg-[var(--bg-surface)] rounded-[3rem]"><RefreshCw className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>}>
                      <Auth onAuthSuccess={() => {}} />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Screen */}
      <AnimatePresence>
        {showAuth && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[var(--bg-surface)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <h2 className="text-2xl font-bold text-white">Account</h2>
              </div>
              <button 
                onClick={() => setShowAuth(false)}
                className="p-2 bg-[var(--bg-card)] hover:bg-[var(--accent)] hover:text-white rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
              <div className="w-full max-w-md">
                <Suspense fallback={<div className="p-10 bg-[var(--bg-surface)] rounded-[3rem] shadow-2xl border border-white/5 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>}>
                  <Auth onAuthSuccess={() => setShowAuth(false)} />
                </Suspense>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Settings Modal */}
      <AnimatePresence>
        {showProfileSettings && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowProfileSettings(false)} />
            <div className="relative w-full max-w-md">
              <Suspense fallback={<div className="p-10 bg-[var(--bg-surface)] rounded-[3rem] flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>}>
                <ProfileSettings user={user} onClose={() => setShowProfileSettings(false)} />
              </Suspense>
              <button 
                onClick={() => signOut(auth)}
                className="w-full mt-4 py-3 rounded-2xl text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Overlay */}
      <div 
        ref={playerRef}
        className={`fixed inset-0 z-50 bg-[var(--bg)] flex transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isPlayerOpen && selectedGame ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Left Sidebar: Preferences & Search */}
        {!isFullscreen && (
          <motion.div 
            animate={{ width: isSidebarCollapsed ? 0 : 220 }}
            className="bg-[var(--bg-surface)] border-r border-white/5 flex flex-col overflow-hidden relative"
          >
            <div className="p-6 border-b border-white/5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-widest opacity-50">
                Preferences
              </h3>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--fg-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Find next..." 
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border-none rounded-xl py-2 pl-9 pr-4 text-[10px] focus:ring-2 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--fg-muted)]/50 text-[var(--fg)]"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              <div className="grid grid-cols-1 gap-2">
                {playerFilteredGames.map(game => (
                  <button
                    key={`player-nav-${game.Title}`}
                    onClick={() => handleGameSelect(game)}
                    className={`flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-[var(--bg-card)] group ${selectedGame?.Title === game.Title ? 'bg-[var(--bg-card)] ring-1 ring-[var(--accent)]/30' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={game.Icon} alt={game.Title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                    </div>
                    <div className="text-left overflow-hidden">
                      <div className="text-[10px] font-bold text-white truncate">{game.Title}</div>
                      <div className="text-[9px] text-[var(--fg-muted)] truncate">{game.Categories[0]}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Player Header (Top Right) */}
          {!isFullscreen && selectedGame && (
            <div className="flex items-center justify-between px-6 py-3 bg-[var(--bg-surface)]/80 backdrop-blur-xl border-b border-white/5">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                   {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10">
                  <img src={selectedGame.Icon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-none">{selectedGame.Title}</h2>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedGame.Categories.map(cat => (
                      <span key={cat} className="text-[8px] text-[var(--fg-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded-md uppercase font-bold tracking-tighter">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPaused(!isPaused)}
                  className={`p-2.5 rounded-xl transition-all ${isPaused ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--fg)] hover:bg-[var(--accent)] hover:text-white'}`}
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
                </button>
                <button 
                  onClick={handleRandomGame}
                  className="p-2.5 bg-[var(--bg-card)] hover:bg-[var(--accent)] hover:text-white text-[var(--fg)] rounded-xl transition-all"
                  title="Random Game"
                >
                  <Shuffle className="w-5 h-5" />
                </button>
                <button 
                  onClick={refreshIframe}
                  className="p-2.5 bg-[var(--bg-card)] hover:bg-[var(--accent)] hover:text-white text-[var(--fg)] rounded-xl transition-all"
                  title="Refresh"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button 
                  onClick={toggleFullscreen}
                  className="p-2.5 bg-[var(--bg-card)] hover:bg-[var(--accent)] hover:text-white text-[var(--fg)] rounded-xl transition-all"
                  title="Fullscreen"
                >
                  <Maximize className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => window.open(selectedGame?.IFrame, '_blank')}
                  className="p-2.5 bg-[var(--bg-card)] hover:bg-[var(--accent)] hover:text-white text-[var(--fg)] rounded-xl transition-all"
                  title="Open in New Tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/5 mx-1" />
                <button 
                  onClick={closePlayer}
                  className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 relative bg-black overflow-hidden shadow-2xl">
            {openGames.map((game) => {
              const isActive = selectedGame?.Title === game.Title;
              if (!isActive && !settings.enableTabs) return null;
              
              return (
                <div 
                  key={game.Title}
                  className={`absolute inset-0 transition-opacity duration-300 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none invisible'}`}
                  style={{ 
                    visibility: isActive ? 'visible' : 'hidden',
                  }}
                >
                  <iframe
                    key={`${game.Title}-${refreshKeys[game.Title] || 0}`}
                    src={isActive || settings.enableTabs ? game.IFrame : 'about:blank'}
                    className={`w-full h-full border-none overflow-hidden transition-all duration-500 ${isPaused ? 'blur-xl scale-95 opacity-50 grayscale' : ''}`}
                    sandbox={settings.cleanMode 
                      ? "allow-forms allow-orientation-lock allow-pointer-lock allow-presentation allow-scripts allow-same-origin allow-modals allow-storage-access-by-user-activation"
                      : "allow-forms allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-scripts allow-same-origin allow-modals allow-downloads allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                    }
                    allow="autoplay; fullscreen; keyboard; pointer-lock; gamepad; camera; microphone; geolocation"
                    title={game.Title}
                    loading={isActive ? "eager" : "lazy"}
                    // @ts-ignore
                    fetchPriority={isActive ? "high" : "low"}
                    referrerPolicy="no-referrer"
                    // @ts-ignore
                    scrolling="no"
                  />
                </div>
              );
            })}
            
            <AnimatePresence>
              {isPaused && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsPaused(false)}
                    className="w-24 h-24 bg-[var(--accent)] text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40"
                  >
                    <Play className="w-10 h-10 fill-current ml-2" />
                  </motion.button>
                  <h3 className="mt-6 text-2xl font-bold text-white tracking-widest uppercase opacity-80">Paused</h3>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="absolute inset-0 -z-10 flex items-center justify-center bg-[var(--bg)]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[var(--bg-card)] border-t-[var(--accent)] rounded-full animate-spin" />
                <p className="text-sm font-medium text-[var(--fg-muted)]">Loading Game...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Menu Drawer (One UI Style Bottom Sheet on Mobile, Side on Desktop) */}
      <AnimatePresence>
        {isSideMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSideMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-[var(--bg-surface)] border-l border-white/5 z-[70] shadow-2xl flex flex-col rounded-l-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[var(--bg-card)]">
                <div className="flex items-center gap-3">
                  {menuView !== 'main' && (
                    <button 
                      onClick={() => setMenuView('main')}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-white">
                    {menuView === 'settings' ? 'Settings' : menuView === 'tabs' ? 'Tabs' : 'Menu'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {user ? (
                    <button 
                      onClick={() => {
                        setShowProfileSettings(true);
                        setIsSideMenuOpen(false);
                      }}
                      className="w-8 h-8 rounded-full overflow-hidden border border-white/10"
                    >
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-full h-full p-1.5 text-[var(--fg-muted)] bg-[var(--bg-surface)]" />
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => {}} // WIP
                      className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-not-allowed opacity-50 relative group"
                    >
                      <User className="w-5 h-5" />
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-[8px] font-black px-1 rounded-full text-black">WIP</div>
                    </button>
                  )}
                  <button 
                    onClick={() => setIsSideMenuOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {menuView === 'main' ? (
                  <div className="space-y-3">
                    <button 
                      onClick={() => setMenuView('settings')}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg)] transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center group-hover:bg-[var(--accent)] transition-colors">
                        <Settings className="w-5 h-5 text-[var(--fg)] group-hover:text-white" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--fg)]">Settings</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-[var(--fg-muted)]" />
                    </button>
                    
                    <button 
                      onClick={() => {}} // Disabled
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-card)] text-[var(--fg-muted)] cursor-not-allowed transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center transition-colors">
                        <Home className="w-5 h-5 opacity-50" />
                      </div>
                      <span className="text-sm font-semibold opacity-50">Social</span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold">WIP</span>
                        <Lock className="w-4 h-4 text-[var(--fg-muted)] opacity-50" />
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        setShowUpdateLog(true);
                        setIsSideMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg)] transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center group-hover:bg-[var(--accent)] transition-colors">
                        <History className="w-5 h-5 text-[var(--fg)] group-hover:text-white" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--fg)]">Update Log</span>
                      <ChevronRight className="w-4 h-4 ml-auto text-[var(--fg-muted)]" />
                    </button>
                  </div>
                ) : menuView === 'settings' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[var(--bg-card)] flex flex-col gap-4">
                      <span className="text-sm font-semibold">Theme</span>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { id: 'default', color: 'bg-blue-500' },
                          { id: 'emerald', color: 'bg-emerald-500' },
                          { id: 'rose', color: 'bg-rose-500' },
                          { id: 'amber', color: 'bg-amber-500' },
                          { id: 'sky', color: 'bg-sky-500' },
                          { id: 'violet', color: 'bg-violet-500' }
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`aspect-square rounded-xl ${t.color} transition-all ${
                              theme === t.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-card)] scale-110' : 'opacity-50 hover:opacity-100'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[var(--bg-card)] flex items-center justify-between">
                      <span className="text-sm font-semibold">Auto Fullscreen</span>
                      <button 
                        onClick={() => setSettings({ ...settings, autoFullscreen: !settings.autoFullscreen })}
                        className={`w-12 h-7 rounded-full transition-colors relative ${settings.autoFullscreen ? 'bg-[var(--accent)]' : 'bg-[var(--bg-surface)]'}`}
                      >
                        <motion.div 
                          animate={{ x: settings.autoFullscreen ? 22 : 2 }}
                          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm" 
                        />
                      </button>
                    </div>
                    <div className="p-4 rounded-2xl bg-[var(--bg-card)] flex items-center justify-between">
                      <span className="text-sm font-semibold">Enable Tabs</span>
                      <button 
                        onClick={() => {
                          const newVal = !settings.enableTabs;
                          setSettings({ ...settings, enableTabs: newVal });
                          if (!newVal) {
                            setOpenGames(selectedGame ? [selectedGame] : []);
                          }
                        }}
                        className={`w-12 h-7 rounded-full transition-colors relative ${settings.enableTabs ? 'bg-[var(--accent)]' : 'bg-[var(--bg-surface)]'}`}
                      >
                        <motion.div 
                          animate={{ x: settings.enableTabs ? 22 : 2 }}
                          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm" 
                        />
                      </button>
                    </div>
                    <div className="p-4 rounded-2xl bg-[var(--bg-card)] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">Clean Mode</span>
                        <span className="text-[10px] text-[var(--fg-muted)]">Blocks ads & popups</span>
                      </div>
                      <button 
                        onClick={() => setSettings({ ...settings, cleanMode: !settings.cleanMode })}
                        className={`w-12 h-7 rounded-full transition-colors relative ${settings.cleanMode ? 'bg-[var(--accent)]' : 'bg-[var(--bg-surface)]'}`}
                      >
                        <motion.div 
                          animate={{ x: settings.cleanMode ? 22 : 2 }}
                          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm" 
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-[var(--fg-muted)]">
                    <Settings className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">Configure your experience</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-[var(--bg-card)] text-center">
                <p className="text-xs text-[var(--fg-muted)] font-medium">Coral</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Update Log Overlay */}
      <AnimatePresence>
        {showUpdateLog && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[var(--bg-surface)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                  <History className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <h2 className="text-2xl font-bold text-white">Update Log</h2>
              </div>
              <button 
                onClick={() => setShowUpdateLog(false)}
                className="p-2 bg-[var(--bg-card)] hover:bg-[var(--accent)] hover:text-white rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full">
              {updateLogs.map((log) => (
                <div key={log.version} className="mb-12">
                  <div className="flex items-baseline gap-4 mb-8">
                    <h3 className="text-4xl font-bold text-[var(--accent)]">v{log.version}</h3>
                    <span className="text-sm font-medium text-[var(--fg-muted)] bg-[var(--bg-card)] px-3 py-1 rounded-full">{log.date}</span>
                  </div>
                  
                  <div className="grid gap-8">
                    {log.sections.map((section, idx) => (
                      <div key={idx} className="bg-[var(--bg-surface)] rounded-3xl p-6 md:p-8">
                        <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                          <div className="w-1.5 h-6 bg-[var(--accent)] rounded-full" />
                          {section.title}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {section.changes?.map((change, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm font-medium text-[var(--fg)]/80">
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                              {change}
                            </div>
                          ))}
                          {section.games?.map((gameName, i) => {
                            const game = games.find(g => g.Title.toLowerCase() === gameName.toLowerCase() || g.Title.toLowerCase().includes(gameName.toLowerCase()));
                            return (
                              <button 
                                key={i} 
                                onClick={() => {
                                  if (game) {
                                    handleGameSelect(game);
                                    setShowUpdateLog(false);
                                  }
                                }}
                                className="flex items-center gap-3 text-sm font-medium text-[var(--fg)]/80 hover:text-[var(--accent)] transition-colors text-left group p-2 rounded-xl hover:bg-[var(--bg-card)]"
                              >
                                {game ? (
                                  <img src={game.Icon} className="w-6 h-6 rounded-md object-cover" alt="" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-6 h-6 rounded-md bg-[var(--bg-card)]" />
                                )}
                                <span>{gameName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-white/5 text-center text-sm text-[var(--fg-muted)]">
              Coral
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Custom Context Menu */}
      <AnimatePresence>
        {contextMenu.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[100] bg-[var(--bg-surface)] border border-white/10 rounded-2xl shadow-2xl p-2 w-48 backdrop-blur-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-[var(--fg-muted)] border-b border-white/5 mb-1 font-bold">
              Coral
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--bg-card)] rounded-xl transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Page
            </button>
            <button 
              onClick={() => handleRandomGame()}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--bg-card)] rounded-xl transition-colors font-medium"
            >
              <Shuffle className="w-4 h-4" /> Random Game
            </button>
            <button 
              onClick={() => setIsSideMenuOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[var(--bg-card)] rounded-xl transition-colors font-medium"
            >
              <div className="flex items-center gap-3">
                <Menu className="w-4 h-4" /> Menu
              </div>
              <ChevronRight className="w-3 h-3 opacity-50" />
            </button>

            {isPlayerOpen && (
              <>
                <div className="h-px bg-white/5 my-1" />
                <div className="px-4 py-1 text-[9px] uppercase tracking-widest text-[var(--fg-muted)] font-bold">
                  Game Player
                </div>
                <button 
                  onClick={() => setIsSideMenuOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--bg-card)] rounded-xl transition-colors font-medium text-[var(--accent)]"
                >
                  <Settings className="w-4 h-4" /> Player Settings
                </button>
                <button 
                  onClick={() => setIsPlayerOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--bg-card)] rounded-xl transition-colors font-medium text-red-400"
                >
                  <X className="w-4 h-4" /> Close Game
                </button>
              </>
            )}

            {showSocial && (
              <>
                <div className="h-px bg-white/5 my-1" />
                <div className="px-4 py-1 text-[9px] uppercase tracking-widest text-[var(--fg-muted)] font-bold">
                  Social
                </div>
                <button 
                  onClick={() => {}}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--bg-card)] rounded-xl transition-colors font-medium text-emerald-400"
                >
                  <Users className="w-4 h-4" /> Friends List
                </button>
                <button 
                  onClick={() => {}}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--bg-card)] rounded-xl transition-colors font-medium text-emerald-400"
                >
                  <MessageSquare className="w-4 h-4" /> Messages
                </button>
              </>
            )}
            <div className="h-px bg-white/5 my-1" />
            <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-[var(--fg-muted)] opacity-50">
              Coral
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
