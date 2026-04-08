import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Play, Heart } from 'lucide-react';

interface Game {
  Title: string;
  Icon: string;
  IFrame: string;
  Categories: string[];
  badge: string;
}

interface GameCardProps {
  game: Game;
  index: number;
  onPlay: (game: Game) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export const GameCard = memo(({ game, index, onPlay, isFavorite, onToggleFavorite }: GameCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "100px" }}
      transition={{ duration: 0.3, delay: (index % 12) * 0.05 }}
      onClick={() => onPlay(game)}
      className="group cursor-pointer"
      whileHover="hover"
      style={{
        // Use content-visibility for modern browsers to skip rendering off-screen cards
        contentVisibility: 'auto',
        containIntrinsicSize: '0 300px'
      }}
    >
      <div className="relative aspect-square mb-3">
        <motion.div 
          className="absolute inset-0 rounded-[2rem] overflow-hidden bg-[var(--bg-surface)] shadow-md group-hover:shadow-[var(--accent-glow)] transition-all duration-300"
          variants={{
            hover: {
              scale: 1.02,
              y: -4,
              transition: {
                duration: 0.2,
                ease: "easeOut"
              }
            }
          }}
        >
          <img
            src={`${game.Icon}${game.Icon.includes('?') ? '&' : '?'}v=1`}
            alt={game.Title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center backdrop-blur-[8px] z-10">
            <div className="w-12 h-12 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300 mb-4">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <h3 className="text-lg font-bold text-white leading-tight px-4 text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{game.Title}</h3>
          </div>

          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(e);
              }}
              className={`absolute top-4 right-4 p-2.5 rounded-2xl backdrop-blur-md transition-all z-20 ${
                isFavorite 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-black/20 text-white/70 hover:bg-black/40 hover:text-white opacity-0 group-hover:opacity-100'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </motion.div>
      </div>
      <h3 className="text-sm font-semibold text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors px-1">
        {game.Title}
      </h3>
    </motion.div>
  );
});

GameCard.displayName = 'GameCard';
