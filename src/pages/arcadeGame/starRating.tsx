import { useState } from 'react';
import { Zap } from 'lucide-react';

export function StarRating({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          className={`transition-colors ${onRate ? 'cursor-pointer' : 'cursor-default'}`}
          onMouseEnter={() => onRate && setHover(n)}
          onMouseLeave={() => onRate && setHover(0)}
          onClick={() => onRate?.(n)}
          disabled={!onRate}
          aria-label={`Rate ${n} of 5`}
        >
          <Zap
            className={`w-4 h-4 ${(hover || rating) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        </button>
      ))}
    </div>
  );
}
