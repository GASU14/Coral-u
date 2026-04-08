import { motion, AnimatePresence } from 'motion/react';
import { Search, Menu, User, Filter, RotateCcw } from 'lucide-react';

interface HeaderProps {
  user: any;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isPlayerOpen: boolean;
  setShowProfileSettings: (show: boolean) => void;
  setIsSideMenuOpen: (open: boolean) => void;
  isMultiSelectOpen: boolean;
  setIsMultiSelectOpen: (open: boolean) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[] | ((prev: string[]) => string[])) => void;
  categories: string[];
}

export function Header({
  user,
  searchQuery,
  setSearchQuery,
  isPlayerOpen,
  setShowProfileSettings,
  setIsSideMenuOpen,
  isMultiSelectOpen,
  setIsMultiSelectOpen,
  selectedCategories,
  setSelectedCategories,
  categories
}: HeaderProps) {
  return (
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
  );
}
