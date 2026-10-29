import { useId } from 'react';

interface FlushLogoProps {
  /**
   * Rendered height in px. Width is derived automatically (SVG is square 30×30 viewBox).
   * Default 32.
   */
  size?: number;
  className?: string;
}

/**
 * Flush logo — the raw card-pair icon with NO background box.
 * The SVG itself IS the logo. Gradient IDs are unique per instance.
 */
export function FlushLogo({ size = 32, className = '' }: FlushLogoProps) {
  const uid = useId().replace(/:/g, '');
  const boltId   = `flush-bolt-${uid}`;
  const shadowId = `flush-shadow-${uid}`;
  const lgId     = `flush-lg-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className={className}
      aria-label="Flush logo"
    >
      <defs>
        <linearGradient id={lgId}>
          <stop offset="59.844053%" stopColor="#eaba39" stopOpacity="1" />
          <stop offset="66.08187%" stopColor="#c5c754" stopOpacity="1" />
          <stop offset="100%"      stopColor="#c26d16" stopOpacity="1" />
        </linearGradient>
        <linearGradient
          id={boltId}
          xlinkHref={`#${lgId}`}
          x1="11.256488" y1="17.529295"
          x2="19.964927" y2="17.529295"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1,0,0,1.0113549,0,-0.11336075)"
        />
        <filter
          id={shadowId}
          x="-76.481674%" y="-51.496675%"
          width="251.975310%" height="202.328140%"
          colorInterpolationFilters="sRGB"
        >
          <feFlood result="flood" floodOpacity="0.498039" floodColor="rgb(0,0,0)" />
          <feGaussianBlur result="blur" in="SourceGraphic" stdDeviation="3" />
          <feOffset result="offset" in="blur" dx="0" dy="0" />
          <feComposite result="comp1" operator="in" in="flood" in2="offset" />
          <feComposite result="comp2" operator="over" in="SourceGraphic" in2="comp1" />
        </filter>
      </defs>

      {/* The icon group from the original Inkscape SVG, scaled to fill the 30×30 viewBox */}
      <g transform="matrix(1.2393211,0,0,1.2393211,-1.6806921,-6.3812497)">
        <g>
          {/* Left card */}
          <g transform="matrix(0.86227277,-0.51219476,0.50644415,0.87206377,-5.3687003,5.4676149)">
            <rect fill="#200548" width="8.826292" height="13.486083" x="3.1737077" y="11.513917" rx="1.6700653" />
            <path
              fill="#2e0963"
              d="m 4.9447919,25.670607 c -0.3677196,-0.170459 -0.80169,-0.628903 -0.9109766,-0.96235 -0.1172498,-0.357746 -0.071584,-10.841245 0.048967,-11.2403 0.1140349,-0.377499 0.4551478,-0.780732 0.833352,-0.985113 0.3045471,-0.164577 0.3440276,-0.166615 3.4914991,-0.180206 l 3.1834686,-0.01375 0.367254,0.237824 c 0.398588,0.258116 0.661606,0.595342 0.772998,0.991092 0.04293,0.15253 0.062,2.321435 0.04834,5.499209 -0.02524,5.872453 -0.01596,5.761642 -0.524111,6.259297 -0.522555,0.511759 -0.482555,0.506462 -3.9237523,0.519505 -2.8558912,0.01081 -3.1141789,0.0013 -3.3870387,-0.125212 z"
            />
          </g>
          {/* Right card — with drop shadow */}
          <g
            transform="matrix(-0.89131291,-0.51210083,-0.52350047,0.87190384,32.992603,5.6178567)"
            filter={`url(#${shadowId})`}
          >
            <rect
              fill="#200548"
              width="8.6894789" height="13.502538"
              x="3.7176547" y="11.661666" rx="1.6721029"
              transform="matrix(0.99988401,-0.01523048,-0.01497612,0.99988785,0,0)"
            />
            <path
              fill="#2e0963"
              d="M 5.1485641,25.622149 C 4.7893394,25.45668 4.3681382,25.005736 4.2643924,24.675541 4.153087,24.321287 4.3097338,13.902957 4.4323519,13.505115 c 0.1159903,-0.376351 0.4552102,-0.780697 0.8287269,-0.987832 0.3007726,-0.166794 0.339558,-0.16924 3.4300243,-0.216314 l 3.1258109,-0.04761 0.35805,0.232418 c 0.388598,0.252248 0.643242,0.584558 0.748393,0.97664 0.04053,0.151118 0.03611,2.306235 -0.01119,5.464254 -0.08741,5.835943 -0.07712,5.725729 -0.581351,6.225685 -0.518525,0.514127 -0.479194,0.508437 -3.8580476,0.5581 -2.8041505,0.04121 -3.0576467,0.03448 -3.324203,-0.08831 z"
            />
          </g>
          {/* Lightning bolt */}
          <path
            fill={`url(#${boltId})`}
            d="m 19.78543,13.247132 -5.4505,3.622116 1.574519,0.924068 -4.50234,4.178578 7.293995,-3.896437 L 17,17.079672 Z"
          />
        </g>
      </g>
    </svg>
  );
}
