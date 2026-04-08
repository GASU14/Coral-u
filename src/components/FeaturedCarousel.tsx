import { motion } from 'motion/react';
import { Sparkles, Play } from 'lucide-react';

interface Game {
  Title: string;
  Icon: string;
  IFrame: string;
  Categories: string[];
  badge: string;
}

interface FeaturedCarouselProps {
  featuredGames: Game[];
  timeLeft: string;
  onPlay: (game: Game) => void;
}

export function FeaturedCarousel({ featuredGames, timeLeft, onPlay }: FeaturedCarouselProps) {
  if (featuredGames.length === 0) return null;

  return (
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
            onClick={() => onPlay(game)}
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
  );
}
