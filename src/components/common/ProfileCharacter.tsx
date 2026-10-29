import React from 'react';

/**
 * ProfileCharacter
 * Renders the avatar's inner character — either a text glyph (letter/digit)
 * or one of the 10 SVG icon options (stored as "icon_<name>" in the DB).
 *
 * All icons are stroke-only (no fill). The `color` prop controls both
 * the text color and the SVG stroke color.
 */

export const PROFILE_ICONS: { key: string; label: string; category: 'plant' | 'animal' }[] = [
  // ── Plants ──────────────────────────────────────────────────────────────
  { key: 'icon_leaf',      label: 'Leaf',       category: 'plant'  },
  { key: 'icon_flower',    label: 'Flower',     category: 'plant'  },
  { key: 'icon_tree',      label: 'Tree',       category: 'plant'  },
  { key: 'icon_succulent', label: 'Succulent',  category: 'plant'  },
  { key: 'icon_fern',      label: 'Fern',       category: 'plant'  },
  // ── Animals ─────────────────────────────────────────────────────────────
  { key: 'icon_paw',       label: 'Paw Print',  category: 'animal' },
  { key: 'icon_bird',      label: 'Bird',       category: 'animal' },
  { key: 'icon_fish',      label: 'Fish',       category: 'animal' },
  { key: 'icon_butterfly', label: 'Butterfly',  category: 'animal' },
  { key: 'icon_turtle',    label: 'Turtle',     category: 'animal' },
  // ── Additional 10 ───────────────────────────────────────────────────────
  { key: 'icon_moon',      label: 'Moon',       category: 'animal' },
  { key: 'icon_star',      label: 'Star',       category: 'animal' },
  { key: 'icon_bolt',      label: 'Bolt',       category: 'animal' },
  { key: 'icon_gem',       label: 'Gem',        category: 'plant'  },
  { key: 'icon_flame',     label: 'Flame',      category: 'animal' },
  { key: 'icon_wave',      label: 'Wave',       category: 'plant'  },
  { key: 'icon_mushroom',  label: 'Mushroom',   category: 'plant'  },
  { key: 'icon_cat',       label: 'Cat',        category: 'animal' },
  { key: 'icon_fox',       label: 'Fox',        category: 'animal' },
  { key: 'icon_cactus',    label: 'Cactus',     category: 'plant'  },
  // ── Additional 10 ───────────────────────────────────────────────────────
  { key: 'icon_dragon',    label: 'Dragon',     category: 'animal' },
  { key: 'icon_crown',     label: 'Crown',      category: 'animal' },
  { key: 'icon_compass',   label: 'Compass',    category: 'plant'  },
  { key: 'icon_snowflake', label: 'Snowflake',  category: 'plant'  },
  { key: 'icon_planet',    label: 'Planet',     category: 'animal' },
  { key: 'icon_feather',   label: 'Feather',    category: 'plant'  },
  { key: 'icon_anchor',    label: 'Anchor',     category: 'animal' },
  { key: 'icon_heart',     label: 'Heart',      category: 'animal' },
  { key: 'icon_crystal',   label: 'Crystal',    category: 'plant'  },
  { key: 'icon_lantern',   label: 'Lantern',    category: 'plant'  },
];

interface IconSvgProps {
  color: string;
  size: number;
}

// ── Individual SVG icons (stroke-only, viewBox 0 0 24 24) ──────────────────

function LeafIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function FlowerIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2a4 4 0 0 1 0 8 4 4 0 0 1 0-8z" />
      <path d="M12 14a4 4 0 0 1 0 8 4 4 0 0 1 0-8z" />
      <path d="M2 12a4 4 0 0 1 8 0 4 4 0 0 1-8 0z" />
      <path d="M14 12a4 4 0 0 1 8 0 4 4 0 0 1-8 0z" />
    </svg>
  );
}

function TreeIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 14h4v8h10v-8h4L12 2z" />
    </svg>
  );
}

function SucculentIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {/* pot */}
      <path d="M8 21h8l-1-5H9l-1 5z" />
      <path d="M9 16h6" />
      {/* center stem */}
      <line x1="12" y1="16" x2="12" y2="11" />
      {/* center rosette */}
      <ellipse cx="12" cy="9" rx="2" ry="2.5" />
      {/* left leaf */}
      <path d="M12 12 C9 11 6 12 6 9 C6 7 8 6 10 8" />
      {/* right leaf */}
      <path d="M12 12 C15 11 18 12 18 9 C18 7 16 6 14 8" />
      {/* top leaf */}
      <path d="M12 9 C11 6 12 3 12 3 C12 3 13 6 12 9" />
    </svg>
  );
}

function FernIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {/* main stem */}
      <path d="M12 22 C12 14 12 10 12 4" />
      {/* left fronds */}
      <path d="M12 18 C10 16 7 16 6 13" />
      <path d="M12 14 C10 12 8 11 7 8" />
      <path d="M12 10 C11 8 10 6 9 4" />
      {/* right fronds */}
      <path d="M12 18 C14 16 17 16 18 13" />
      <path d="M12 14 C14 12 16 11 17 8" />
      <path d="M12 10 C13 8 14 6 15 4" />
    </svg>
  );
}

function PawIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {/* main pad */}
      <ellipse cx="12" cy="15" rx="4" ry="3" />
      {/* toe pads */}
      <ellipse cx="7"  cy="10" rx="1.5" ry="1.8" />
      <ellipse cx="10" cy="8"  rx="1.5" ry="1.8" />
      <ellipse cx="14" cy="8"  rx="1.5" ry="1.8" />
      <ellipse cx="17" cy="10" rx="1.5" ry="1.8" />
    </svg>
  );
}

function BirdIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10c.7-.7 1-1.5 1-2.3A3.7 3.7 0 0 0 14.3 4C12.8 4 11.4 4.7 10.5 5.8" />
      <path d="M10.5 5.8C8.5 5.3 3 6 3 12c0 3.5 2.5 6 6 7l2-3" />
      <path d="M11 16l2-3 6 1-2 3-6-1z" />
      <path d="M11 16 C12 18 13 20 14 21" />
    </svg>
  );
}

function FishIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 12 C6.5 8 10 5 15 5 C20 5 21 9 21 12 C21 15 20 19 15 19 C10 19 6.5 16 6.5 12z" />
      <path d="M6.5 12 L3 8" />
      <path d="M6.5 12 L3 16" />
      <circle cx="17" cy="10" r="1" fill={color} stroke="none" />
    </svg>
  );
}

function ButterflyIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {/* body */}
      <line x1="12" y1="6" x2="12" y2="18" />
      {/* antennae */}
      <path d="M12 6 C10 4 8 3 7 2" />
      <path d="M12 6 C14 4 16 3 17 2" />
      {/* upper wings */}
      <path d="M12 8 C9 7 4 8 3 11 C2 14 5 16 8 15 C10 14 12 12 12 12" />
      <path d="M12 8 C15 7 20 8 21 11 C22 14 19 16 16 15 C14 14 12 12 12 12" />
      {/* lower wings */}
      <path d="M12 12 C10 12 5 13 4 16 C3 18 5 20 8 19 C10 18 12 16 12 16" />
      <path d="M12 12 C14 12 19 13 20 16 C21 18 19 20 16 19 C14 18 12 16 12 16" />
    </svg>
  );
}

function TurtleIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {/* shell */}
      <ellipse cx="12" cy="12" rx="6" ry="5" />
      {/* shell pattern */}
      <path d="M12 7 L12 17" />
      <path d="M6 12 L18 12" />
      <path d="M8 8.5 L16 8.5" />
      <path d="M8 15.5 L16 15.5" />
      {/* head */}
      <circle cx="12" cy="5.5" r="1.5" />
      {/* tail */}
      <path d="M12 17 C12 19 11 20 10 21" />
      {/* legs */}
      <path d="M6.5 9 C4.5 8 3 8 2.5 9.5" />
      <path d="M6.5 15 C4.5 16 3 16 2.5 14.5" />
      <path d="M17.5 9 C19.5 8 21 8 21.5 9.5" />
      <path d="M17.5 15 C19.5 16 21 16 21.5 14.5" />
    </svg>
  );
}

function MoonIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function StarIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function BoltIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 L4.5 13.5 L11 13.5 L11 22 L19.5 10.5 L13 10.5 Z" />
    </svg>
  );
}

function GemIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3 L2 9 L12 21 L22 9 L18 3 Z" />
      <path d="M2 9 L22 9" />
      <path d="M6 3 L12 9 L18 3" />
      <path d="M12 9 L12 21" />
    </svg>
  );
}

function FlameIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5 C7 12.5 7 10 9 8 C9 10 10.5 11 12 11 C12 9 13 7 14 5 C16 8 17 11 15.5 14.5 C17 13 17.5 11 17.5 11 C19 14 18 18 15 20 C13.5 21 11 21.5 9 20 C6.5 18.5 6 15 8.5 14.5 Z" />
    </svg>
  );
}

function WaveIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10 C4 7 6 7 8 10 C10 13 12 13 14 10 C16 7 18 7 20 10 C22 13 22 13 22 13" />
      <path d="M2 15 C4 12 6 12 8 15 C10 18 12 18 14 15 C16 12 18 12 20 15" />
    </svg>
  );
}

function MushroomIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12 C4 7 7.5 3 12 3 C16.5 3 20 7 20 12 Z" />
      <path d="M9 12 C9 15 9 18 9 20 C9 21 15 21 15 20 C15 18 15 15 15 12" />
      <path d="M4 12 C6 13.5 9 14 12 14 C15 14 18 13.5 20 12" />
    </svg>
  );
}

function CatIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="6" />
      <path d="M6 9 L4 4 L9 7.5" />
      <path d="M18 9 L20 4 L15 7.5" />
      <circle cx="9.5" cy="12" r="0.8" fill={color} stroke="none" />
      <circle cx="14.5" cy="12" r="0.8" fill={color} stroke="none" />
      <path d="M12 14 L11 15.5 M12 14 L13 15.5" />
      <circle cx="12" cy="13.5" r="0.5" fill={color} stroke="none" />
      <path d="M6 13 L9 13.5 M6 14.5 L9 14" />
      <path d="M18 13 L15 13.5 M18 14.5 L15 14" />
    </svg>
  );
}

function FoxIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6 L3 2 L8 5.5 C9 4.5 10.5 4 12 4 C13.5 4 15 4.5 16 5.5 L21 2 L19 6 C20.5 7.5 21 9.5 21 11 C21 15 17 18 12 18 C7 18 3 15 3 11 C3 9.5 3.5 7.5 5 6 Z" />
      <circle cx="9" cy="11" r="1" fill={color} stroke="none" />
      <circle cx="15" cy="11" r="1" fill={color} stroke="none" />
      <path d="M11 13.5 L12 15 L13 13.5" />
    </svg>
  );
}

function CactusIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21 L12 6 C12 4.3 13 3 14.5 3 C16 3 17 4.3 17 6 L17 10" />
      <path d="M12 9 L8 9 C6.3 9 5 10 5 11.5 L5 14" />
      <path d="M9 21 L15 21" />
      <circle cx="12" cy="10" r="0.4" fill={color} stroke="none" />
      <circle cx="12" cy="14" r="0.4" fill={color} stroke="none" />
      <circle cx="12" cy="18" r="0.4" fill={color} stroke="none" />
    </svg>
  );
}

function DragonIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8c0 0 2-3 5-3s5 3 5 3" />
      <path d="M8 5v3" />
      <path d="M13 8c1-1 3-2 5-1l3 2-2 1" />
      <path d="M5 11c-1 2-1 4 1 6l3 3c1 1 3 1 4 0l2-2" />
      <path d="M9 14l2 2" />
      <circle cx="6" cy="9" r="1" fill={color} />
    </svg>
  );
}

function CrownIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17l3-9 4 5 3-8 3 8 4-5 3 9H2z" />
      <path d="M2 17h20" />
    </svg>
  );
}

function CompassIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M16.2 7.8l-2.5 6.3-6.3 2.5 2.5-6.3z" />
      <circle cx="12" cy="12" r="1" fill={color} />
    </svg>
  );
}

function SnowflakeIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

function PlanetIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M3 9c3-2 12 0 18 3" />
      <path d="M3 15c3 2 12 0 18-3" />
    </svg>
  );
}

function FeatherIconSvg({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 4c-4 0-10 4-12 10" />
      <path d="M20 4C16 8 10 14 4 20" />
      <path d="M4 20l4-2" />
      <path d="M8 12l4-2" />
      <path d="M12 8l4-2" />
    </svg>
  );
}

function AnchorIconSvg({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="6" r="2" />
      <line x1="12" y1="8" x2="12" y2="20" />
      <path d="M5 14c0 4 3 6 7 6s7-2 7-6" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function HeartIconSvg({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21C12 21 3 14 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 13-9 13z" />
    </svg>
  );
}

function CrystalIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l4 5H8z" />
      <path d="M8 7l-4 8h16l-4-8" />
      <path d="M4 15l8 7 8-7" />
    </svg>
  );
}

function LanternIcon({ color, size }: IconSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="5" />
      <path d="M8 5h8l1 3v8l-1 3H8l-1-3V8z" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
      <line x1="8" y1="11" x2="16" y2="11" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.ComponentType<IconSvgProps>> = {
  icon_leaf:      LeafIcon,
  icon_flower:    FlowerIcon,
  icon_tree:      TreeIcon,
  icon_succulent: SucculentIcon,
  icon_fern:      FernIcon,
  icon_paw:       PawIcon,
  icon_bird:      BirdIcon,
  icon_fish:      FishIcon,
  icon_butterfly: ButterflyIcon,
  icon_turtle:    TurtleIcon,
  icon_moon:      MoonIcon,
  icon_star:      StarIcon,
  icon_bolt:      BoltIcon,
  icon_gem:       GemIcon,
  icon_flame:     FlameIcon,
  icon_wave:      WaveIcon,
  icon_mushroom:  MushroomIcon,
  icon_cat:       CatIcon,
  icon_fox:       FoxIcon,
  icon_cactus:    CactusIcon,
  icon_dragon:    DragonIcon,
  icon_crown:     CrownIcon,
  icon_compass:   CompassIcon,
  icon_snowflake: SnowflakeIcon,
  icon_planet:    PlanetIcon,
  icon_feather:   FeatherIconSvg,
  icon_anchor:    AnchorIconSvg,
  icon_heart:     HeartIconSvg,
  icon_crystal:   CrystalIcon,
  icon_lantern:   LanternIcon,
};

export function isProfileIcon(char: string | undefined | null): boolean {
  return !!char && char.startsWith('icon_');
}

interface ProfileCharacterProps {
  /** The stored profile_character value (letter, digit, or "icon_<name>") */
  char: string | undefined | null;
  /** The color applied to text or SVG stroke */
  color: string;
  /** Display size in px — used for font-size (text) or SVG dimensions (icon) */
  size?: number;
  className?: string;
}

/**
 * Drop-in replacement for rendering the profile character inside an avatar circle.
 * Handles both text glyphs and SVG icons from a single component.
 */
export function ProfileCharacter({ char, color, size = 28, className = '' }: ProfileCharacterProps) {
  if (!char) return <span style={{ color, fontSize: size }} className={className}>?</span>;

  if (isProfileIcon(char)) {
    const IconComp = ICON_MAP[char];
    if (!IconComp) return <span style={{ color, fontSize: size }} className={className}>?</span>;
    return <IconComp color={color} size={size} />;
  }

  return (
    <span
      className={`font-bold select-none leading-none ${className}`}
      style={{ color, fontSize: size }}
    >
      {char}
    </span>
  );
}
