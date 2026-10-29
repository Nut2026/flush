/**
 * VirtualCardList — renders large card lists efficiently using @tanstack/react-virtual.
 * Only the visible rows are mounted in the DOM; off-screen rows use placeholder height.
 *
 * Usage:
 *   <VirtualCardList items={cards} renderItem={(card, idx) => <MyRow card={card} />} estimateSize={80} />
 */
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualCardListProps<T> {
  items: T[];
  /** Render a single item row. Must be stable height OR close to estimateSize. */
  renderItem: (item: T, index: number) => React.ReactNode;
  /**
   * Estimated row height in px. Used to compute scroll position.
   * Over-estimating is safer than under-estimating.
   * @default 88
   */
  estimateSize?: number;
  /** Max height of the scroll container. Defaults to 'clamp(320px, 60vh, 600px)'. */
  maxHeight?: string;
  className?: string;
}

export function VirtualCardList<T>({
  items,
  renderItem,
  estimateSize = 88,
  maxHeight = 'clamp(320px, 60vh, 600px)',
  className = '',
}: VirtualCardListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className={`overflow-y-auto w-full ${className}`}
      style={{ maxHeight, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {/* Total scroll height sentinel */}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(vRow => (
          <div
            key={vRow.key}
            data-index={vRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vRow.start}px)`,
            }}
          >
            {renderItem(items[vRow.index], vRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
