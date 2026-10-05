/**
 * Single source of truth for colors. Everything else (Tamagui themes, native headers, the status bar,
 * StyleSheet styles) derives from these two palettes.
 *
 * Brand green #2ECC71 is the primary color in both modes. Text on top of it uses a dark ink
 * (`onPrimary`, ~8:1 contrast) because white on #2ECC71 is only ~2:1.
 */
export type Scheme = 'light' | 'dark';

export const BRAND = '#2ECC71';

export interface Palette {
  background: string; // screen background
  surface: string; // cards, sheets, inputs
  surfaceAlt: string; // segmented controls, subtle fills
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string; // fills (buttons, switches)
  onPrimary: string; // text/icons on primary fills
  primarySoft: string; // translucent brand tint
  primaryText: string; // brand-colored text on `background` (links)
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  overlay: string; // modal scrims
  shadow: string;
}

export const palettes: Record<Scheme, Palette> = {
  light: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F5F4',
    border: '#E4E7EB',
    text: '#14211A',
    textMuted: '#4B5A52',
    textSubtle: '#6B7A72',
    primary: BRAND,
    onPrimary: '#06210F',
    primarySoft: 'rgba(46,204,113,0.14)',
    primaryText: '#17803F',
    danger: '#D93636',
    dangerSoft: 'rgba(217,54,54,0.10)',
    success: '#1E9E55',
    warning: '#B7791F',
    overlay: 'rgba(0,0,0,0.45)',
    shadow: 'rgba(0,0,0,0.12)',
  },
  dark: {
    background: '#0E1512',
    surface: '#16201B',
    surfaceAlt: '#1E2B25',
    border: '#2A3A32',
    text: '#EDF3EF',
    textMuted: '#AEBDB5',
    textSubtle: '#8A9A92',
    primary: BRAND,
    onPrimary: '#06210F',
    primarySoft: 'rgba(46,204,113,0.20)',
    primaryText: '#43DB85',
    danger: '#FF6B6B',
    dangerSoft: 'rgba(255,107,107,0.16)',
    success: '#43DB85',
    warning: '#F0B34A',
    overlay: 'rgba(0,0,0,0.65)',
    shadow: 'rgba(0,0,0,0.5)',
  },
};

/**
 * The camera preview is dark in BOTH themes, so UI drawn over it uses these fixed colors.
 * (They are intentionally not theme dependent.)
 */
export const CAMERA = {
  black: '#000000',
  topScrim: 'rgba(0,0,0,0.25)',
  pill: 'rgba(0,0,0,0.85)',
  pillSoft: 'rgba(0,0,0,0.55)',
  pillLight: 'rgba(0,0,0,0.45)',
  modalScrim: 'rgba(0,0,0,0.6)',
  onCamera: '#FFFFFF',
  onCameraSoft: 'rgba(255,255,255,0.1)',
  onCameraBorder: 'rgba(255,255,255,0.25)',
  onCameraBorderStrong: 'rgba(255,255,255,0.5)',
  warn: '#FF6B6B',
  warnBg: 'rgba(255,99,71,0.18)',
} as const;
