import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, Play, Gamepad2, Shuffle, ArrowUp, Trophy, 
  RotateCcw, Maximize, Menu, Settings, History, Layout, 
  ChevronRight, Sparkles, Home, Grid, Info, ChevronLeft,
  Lock, Filter, MousePointer2, Layers, RefreshCw, Pause, User, Users, MessageSquare, ExternalLink, ShieldCheck, Heart
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, db } from './firebase';
import gamesData from '../game.json';
import { GameCard } from './components/GameCard';
import Calculator from './components/Calculator';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FeaturedCarousel } from './components/FeaturedCarousel';
import { GamePlayer } from './components/GamePlayer';
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
  const [favorites, setFavorites] = useState<string[]>([]);
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
      iframe.allow = "autoplay; fullscreen; pointer-lock; gamepad; camera; microphone; geolocation; xr-spatial-tracking";
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
  const [isPlayerSidebarCollapsed, setIsPlayerSidebarCollapsed] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Sync favorites with Firestore
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setFavorites(doc.data().favorites || []);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const toggleFavorite = async (gameTitle: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const isFavorited = favorites.includes(gameTitle);
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        favorites: isFavorited ? arrayRemove(gameTitle) : arrayUnion(gameTitle)
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

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
  const handlePlay = useCallback((game: Game) => {
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
    handlePlay(games[randomIdx]);
  }, [games, handlePlay]);

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

      <Header 
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isPlayerOpen={isPlayerOpen}
        setShowProfileSettings={setShowProfileSettings}
        setIsSideMenuOpen={setIsSideMenuOpen}
        isMultiSelectOpen={isMultiSelectOpen}
        setIsMultiSelectOpen={setIsMultiSelectOpen}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        categories={categories}
      />

      {/* Tabs UI - Moved under header and rotated */}
      {settings.enableTabs && openGames.length > 0 && !isPlayerOpen && (
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {openGames.map((game) => (
              <div
                key={`tab-${game.Title}`}
                onClick={() => handlePlay(game)}
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

      <main className={`transition-opacity duration-300 ${isPlayerOpen ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : 'opacity-100'}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Featured Carousel */}
          {!searchQuery && selectedCategories.length === 0 && (
            <FeaturedCarousel 
              featuredGames={featuredGames}
              timeLeft={timeLeft}
              onPlay={handlePlay}
            />
          )}

          {/* Recommended Section */}
          {!searchQuery && selectedCategories.length === 0 && favorites.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
                    <Heart className="w-5 h-5 fill-current" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--fg)]">Recommended for You</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {gamesData
                  .filter(g => !favorites.includes(g.Title))
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 5)
                  .map((game, idx) => (
                    <GameCard 
                      key={game.Title} 
                      game={game} 
                      index={idx} 
                      onPlay={handlePlay}
                      isFavorite={favorites.includes(game.Title)}
                      onToggleFavorite={() => toggleFavorite(game.Title)}
                    />
                  ))}
              </div>
            </motion.section>
          )}

          {/* Main Grid */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-[var(--fg)]">
                {searchQuery ? 'Search Results' : selectedCategories.length > 0 ? 'Filtered Games' : 'All Games'}
              </h2>
            </div>
            <div className="text-sm text-[var(--fg-muted)] font-medium">
              {filteredGames.length} games found
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {visibleGames.map((game, idx) => (
              <GameCard 
                key={game.Title} 
                game={game} 
                index={idx} 
                onPlay={handlePlay}
                isFavorite={favorites.includes(game.Title)}
                onToggleFavorite={() => toggleFavorite(game.Title)}
              />
            ))}
          </div>

          {/* Loading State */}
          {visibleGames.length < filteredGames.length && (
            <div ref={loadMoreRef} id="load-more" className="py-20 flex justify-center">
              <div className="w-8 h-8 border-4 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
          )}
        </div>
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

      <GamePlayer 
        isOpen={isPlayerOpen}
        onClose={closePlayer}
        selectedGame={selectedGame}
        openGames={openGames}
        onPlay={handlePlay}
        closeTab={closeTab}
        refreshIframe={refreshIframe}
        refreshKeys={refreshKeys}
        toggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        playerFilteredGames={playerFilteredGames}
        playerSearchQuery={playerSearchQuery}
        setPlayerSearchQuery={setPlayerSearchQuery}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        isSidebarCollapsed={isPlayerSidebarCollapsed}
        setIsSidebarCollapsed={setIsPlayerSidebarCollapsed}
      />

      <Sidebar 
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
        user={user}
        favorites={favorites}
        games={games}
        onPlay={handlePlay}
        settings={settings}
        setSettings={setSettings}
        theme={theme}
        setTheme={setTheme}
        menuView={menuView}
        setMenuView={setMenuView}
        onShowUpdateLog={() => setShowUpdateLog(true)}
      />

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
                                    handlePlay(game);
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
