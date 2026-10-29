import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface GuestGateProps {
  /** The feature name shown in the tooltip, e.g. "Smart Generate" */
  feature: string;
  /** Full override message. If omitted, defaults to "[signUpOrLogin] [feature]" */
  message?: string;
  children: React.ReactNode;
  /** Extra classes applied to the wrapper */
  className?: string;
}

/**
 * Wraps any feature that requires an account.
 * In guest mode:
 *  - Dims the content with ~40% opacity overlay
 *  - On hover (desktop) or tap (mobile), shows a tooltip always fully visible
 *  - Two-phase render: invisible first → measure actual size → reposition → show
 *  - Clicks do NOTHING — no navigation to sign-up
 */
export function GuestGate({ feature, message, children, className = '' }: GuestGateProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tipStyle, setTipStyle] = useState<React.CSSProperties>({});
  const [tipReady, setTipReady] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback((tipH?: number) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Tip width: at most 260 but never wider than viewport minus margins
    const tipW = Math.min(260, vw - margin * 2);
    const resolvedH = tipH ?? (tipRef.current?.offsetHeight ?? 56);

    // Prefer above the element; fall back to below; clamp to viewport
    let top = rect.top - resolvedH - margin;
    if (top < margin) top = rect.bottom + margin;
    if (top + resolvedH > vh - margin) top = Math.max(margin, vh - resolvedH - margin);

    // Center horizontally over the element, clamp to viewport
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(margin, Math.min(left, vw - tipW - margin));

    setTipStyle({ position: 'fixed', top, left, width: tipW, zIndex: 9999 });
  }, []);

  // After tooltip renders (invisible), measure its real height and reposition
  useLayoutEffect(() => {
    if (!tooltipVisible || !tipRef.current) return;
    const h = tipRef.current.offsetHeight;
    computePosition(h);
    setTipReady(true);
  }, [tooltipVisible, computePosition]);

  const showTip = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setTipReady(false);
    computePosition();
    setTooltipVisible(true);
  }, [computePosition]);

  const hideTip = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      setTooltipVisible(false);
      setTipReady(false);
    }, 200);
  }, []);

  // Mobile: toggle on tap, no navigation
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (tooltipVisible) {
      setTooltipVisible(false);
      setTipReady(false);
    } else {
      showTip();
      hideTimer.current = setTimeout(() => {
        setTooltipVisible(false);
        setTipReady(false);
      }, 2500);
    }
  }, [tooltipVisible, showTip]);

  // Recompute on scroll/resize
  useEffect(() => {
    if (!tooltipVisible) return;
    const update = () => computePosition(tipRef.current?.offsetHeight);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [tooltipVisible, computePosition]);

  const prefix = "Sign Up or Log In to";
  const tooltipText = message ?? `${prefix} ${feature}`;

  return (
    <div className={`relative ${className}`}>
      {/* Dimmed content */}
      <div className="opacity-40 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Click-capture overlay — does NOT navigate */}
      <div
        ref={overlayRef}
        className="absolute inset-0 cursor-not-allowed z-10"
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && handleClick(e as unknown as React.MouseEvent)}
        aria-label={tooltipText}
      />

      {/* Tooltip — portaled to body; invisible on first render until size is measured */}
      {tooltipVisible && createPortal(
        <div
          ref={tipRef}
          className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-xs font-medium pointer-events-none"
          style={{ ...tipStyle, opacity: tipReady ? 1 : 0, transition: 'opacity 0.1s' }}
          role="tooltip"
        >
          🔒 {tooltipText}
        </div>,
        document.body
      )}
    </div>
  );
}
