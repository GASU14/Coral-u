import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Maximize, RotateCcw, Share2, Heart, 
  ChevronRight, ChevronLeft, Search, Gamepad2, 
  ExternalLink, Info, Layout, Layers, Pause, Play,
  RefreshCw, MousePointer2, Settings
} from 'lucide-react';

interface Game {
  Title: string;
  Icon: string;
  IFrame: string;
  Categories: string[];
  badge: string;
}

interface GamePlayerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGame: Game | null;
  openGames: Game[];
  onPlay: (game: Game) => void;
  closeTab: (gameTitle: string) => void;
  refreshIframe: () => void;
  refreshKeys: Record<string, number>;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  playerFilteredGames: Game[];
  playerSearchQuery: string;
  setPlayerSearchQuery: (query: string) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  playerRef: React.RefObject<HTMLDivElement | null>;
}

export function GamePlayer({
  isOpen,
  onClose,
  selectedGame,
  openGames,
  onPlay,
  closeTab,
  refreshIframe,
  refreshKeys,
  toggleFullscreen,
  isFullscreen,
  playerFilteredGames,
  playerSearchQuery,
  setPlayerSearchQuery,
  isPaused,
  setIsPaused,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  playerRef
}: GamePlayerProps) {
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [handleMouseMove]);

  if (!selectedGame) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={playerRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col overflow-hidden"
          style={{ 
            // Ensure 1:1 coordinate mapping by avoiding sub-pixel rendering issues
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden'
          }}
        >
          {/* Player Header / Tabs */}
          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                exit={{ y: -100 }}
                className="p-4 bg-[var(--bg-surface)]/80 backdrop-blur-xl border-b border-white/5 flex items-center gap-4 z-50"
              >
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <button 
                    onClick={onClose}
                    className="p-2.5 hover:bg-white/10 rounded-2xl transition-all group shrink-0"
                  >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                  </button>
                  
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
                    {openGames.map((game) => (
                      <div
                        key={`player-tab-${game.Title}`}
                        onClick={() => onPlay(game)}
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all min-w-[140px] max-w-[200px] group relative cursor-pointer border ${
                          selectedGame.Title === game.Title 
                            ? 'bg-[var(--accent)] text-white border-transparent shadow-lg shadow-blue-500/20' 
                            : 'bg-white/5 text-[var(--fg-muted)] hover:bg-white/10 border-white/5'
                        }`}
                      >
                        <img src={game.Icon} className="w-4 h-4 rounded-sm object-cover" alt="" referrerPolicy="no-referrer" />
                        <span className="text-xs font-bold truncate flex-1">{game.Title}</span>
                        {openGames.length > 1 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(game.Title);
                            }}
                            className="p-1 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={`p-3 rounded-2xl transition-all hover:scale-110 active:scale-95 ${!isSidebarCollapsed ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}
                    title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
                  >
                    <Layout className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={refreshIframe}
                    className="p-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl transition-all hover:scale-110 active:scale-95"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={toggleFullscreen}
                    className="p-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl transition-all hover:scale-110 active:scale-95"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={onClose}
                    className="p-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all hover:scale-110 active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Viewport */}
          <div className="flex-1 relative bg-[var(--bg)] flex items-center justify-center overflow-hidden select-none">
            <div 
              className="relative w-full h-full"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedGame.Title}-${refreshKeys[selectedGame.Title] || 0}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 w-full h-full"
                >
                  {isPaused && (
                    <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-24 h-24 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-2xl mb-6 cursor-pointer hover:scale-110 transition-transform" onClick={() => setIsPaused(false)}>
                          <Play className="w-10 h-10 text-white fill-white ml-1" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter italic">GAME PAUSED</h2>
                        <p className="text-[var(--fg-muted)] mt-2 font-bold">Click to resume</p>
                      </motion.div>
                    </div>
                  )}
                  <iframe
                    src={selectedGame.IFrame}
                    className="absolute inset-0 w-full h-full border-none block"
                    allow="autoplay; fullscreen; pointer-lock; gamepad; camera; microphone; geolocation; xr-spatial-tracking"
                    title={selectedGame.Title}
                    referrerPolicy="no-referrer"
                    sandbox="allow-forms allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-same-origin"
                    // @ts-ignore
                    scrolling="no"
                    style={{ pointerEvents: 'auto', touchAction: 'none' }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Sidebar - Recommendations */}
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ x: 320 }}
                animate={{ x: 0 }}
                exit={{ x: 320 }}
                className="hidden lg:flex w-80 bg-[var(--bg-surface)]/40 border-l border-white/5 flex-col p-6 overflow-hidden backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-white text-sm tracking-widest uppercase flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--accent)]" /> Up Next
                  </h3>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input 
                    type="text" 
                    placeholder="Search library..."
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border-none rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-[var(--accent)] text-white placeholder:text-white/20"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                  {playerFilteredGames.map((game) => (
                    <button
                      key={`rec-${game.Title}`}
                      onClick={() => onPlay(game)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all group ${
                        selectedGame.Title === game.Title ? 'bg-[var(--accent)]/20 ring-1 ring-[var(--accent)]/50' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                        <img src={game.Icon} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-xs font-bold text-white truncate group-hover:text-[var(--accent)] transition-colors">{game.Title}</div>
                        <div className="text-[10px] text-white/40 truncate">{game.Categories[0]}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-[var(--accent)]/10 rounded-2xl border border-[var(--accent)]/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Info className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Pro Tip</span>
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    Press <span className="text-white font-bold">F11</span> for true fullscreen or use the <span className="text-white font-bold">Sidebar Toggle</span> to maximize your view.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
