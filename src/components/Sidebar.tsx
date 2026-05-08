import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Settings, History, Layout, ChevronRight, 
  Sparkles, Home, Grid, Info, ShieldCheck, Heart, 
  LogOut, User, Gamepad2, Play
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface Game {
  Title: string;
  Icon: string;
  IFrame: string;
  Categories: string[];
  badge: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  games: Game[];
  onPlay: (game: Game) => void;
  theme: string;
  setTheme: (theme: string) => void;
  settings: any;
  setSettings: (settings: any) => void;
  menuView: 'main' | 'settings' | 'tabs';
  setMenuView: (view: 'main' | 'settings' | 'tabs') => void;
  onShowUpdateLog: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  user,
  games,
  onPlay,
  theme,
  setTheme,
  settings,
  setSettings,
  menuView,
  setMenuView,
  onShowUpdateLog
}: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex justify-end"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm bg-[var(--bg-surface)] h-full shadow-2xl flex flex-col border-l border-white/5"
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/20 flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">Menu</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              {menuView === 'main' ? (
                <>
                  {/* User Section */}
                  {user && (
                    <div className="bg-[var(--bg-card)] rounded-3xl p-4 border border-white/5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[var(--bg-surface)]">
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{user.displayName}</h3>
                        <p className="text-xs text-[var(--fg-muted)] truncate">{user.email}</p>
                      </div>
                      <button 
                        onClick={() => signOut(auth)}
                        className="p-2 hover:bg-red-500/10 text-red-400 rounded-xl transition-colors"
                        title="Sign Out"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="space-y-2">
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] transition-all group border border-white/5">
                      <div className="flex items-center gap-4">
                        <Home className="w-5 h-5 text-[var(--accent)]" />
                        <span className="font-bold text-sm">Home</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--fg-muted)] group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => {
                        onShowUpdateLog();
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] transition-all group border border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <History className="w-5 h-5 text-blue-500" />
                        <span className="font-bold text-sm">Update Log</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--fg-muted)] group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setMenuView('settings')}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] transition-all group border border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <Settings className="w-5 h-5 text-amber-500" />
                        <span className="font-bold text-sm">Settings</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--fg-muted)] group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setMenuView('tabs')}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] transition-all group border border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <Layout className="w-5 h-5 text-emerald-500" />
                        <span className="font-bold text-sm">Tabs Manager</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--fg-muted)] group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  {/* Themes */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-[var(--fg-muted)] uppercase tracking-widest">Themes</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['default', 'obsidian', 'midnight', 'forest', 'sunset', 'ocean', 'nebula', 'gold'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`p-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                            theme === t ? 'bg-[var(--accent)] text-white border-transparent' : 'bg-[var(--bg-card)] text-[var(--fg-muted)] border-white/5 hover:border-white/20'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : menuView === 'settings' ? (
                <div className="space-y-6">
                  <button onClick={() => setMenuView('main')} className="flex items-center gap-2 text-xs font-bold text-[var(--accent)] hover:underline">
                    <ChevronRight className="w-4 h-4 rotate-180" /> Back to Menu
                  </button>
                  <h3 className="text-xl font-black text-white">Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-card)] border border-white/5">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Auto Fullscreen</span>
                        <span className="text-[10px] text-[var(--fg-muted)]">Launch games in fullscreen</span>
                      </div>
                      <button 
                        onClick={() => setSettings({...settings, autoFullscreen: !settings.autoFullscreen})}
                        className={`w-12 h-6 rounded-full transition-all relative ${settings.autoFullscreen ? 'bg-[var(--accent)]' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.autoFullscreen ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-card)] border border-white/5">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Enable Tabs</span>
                        <span className="text-[10px] text-[var(--fg-muted)]">Keep multiple games open</span>
                      </div>
                      <button 
                        onClick={() => setSettings({...settings, enableTabs: !settings.enableTabs})}
                        className={`w-12 h-6 rounded-full transition-all relative ${settings.enableTabs ? 'bg-[var(--accent)]' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.enableTabs ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                   <button onClick={() => setMenuView('main')} className="flex items-center gap-2 text-xs font-bold text-[var(--accent)] hover:underline">
                    <ChevronRight className="w-4 h-4 rotate-180" /> Back to Menu
                  </button>
                  <h3 className="text-xl font-black text-white">Active Tabs</h3>
                  <p className="text-xs text-[var(--fg-muted)]">This feature is coming soon to the sidebar!</p>
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-white/5 bg-black/20">
              <div className="flex items-center justify-between text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest">
                <span>Coral v1.2.4</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
