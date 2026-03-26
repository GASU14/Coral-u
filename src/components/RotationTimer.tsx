import { memo, useEffect, useState } from 'react';

interface RotationTimerProps {
  rotationIntervalMs: number;
}

export const RotationTimer = memo(({ rotationIntervalMs }: RotationTimerProps) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentPeriod = Math.floor(currentTime / rotationIntervalMs);
  const nextRotation = (currentPeriod + 1) * rotationIntervalMs;
  const diff = Math.max(0, nextRotation - currentTime);
  
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  
  const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-card)] rounded-full border border-white/5">
      <span className="text-xs font-mono font-medium text-[var(--accent)]">{timeString}</span>
    </div>
  );
});

RotationTimer.displayName = 'RotationTimer';
