// Studio visual design tokens — warm parchment / wood / light palette.
// Use these directly in inline `style={}` props for studio-native components.

export const S = {
  bg:            '#fdf8f0',  // window background — warm parchment
  surface:       '#f5ede0',  // card / panel surface — warm cream
  surfaceAlt:    '#ede0cc',  // slightly lifted surface
  hover:         '#e8d4bb',  // hover fill
  border:        '#d4b896',  // default border — warm tan
  borderAccent:  '#8c5c32',  // wood-tone accent border (matches window frame)
  borderFaint:   '#ecddc8',  // subtle separator

  textPrimary:   '#1e1008',  // warm near-black — primary text
  textSecondary: '#5a3518',  // warm dark brown — secondary / labels
  textMuted:     '#8a6040',  // medium warm brown — hints / meta
  textFaint:     '#b89070',  // light warm brown — placeholders

  accent:        '#a85c10',  // darker amber/ochre — readable on light bg
  accentBg:      'rgba(168,92,16,0.10)',
  accentText:    '#ffffff',  // white text on accent background
  /** Default color for text links on light studio / listen surfaces (timestamps, inline anchors). */
  link:          '#4c85e0',

  success:       '#1a7a42',
  successBg:     'rgba(26,122,66,0.10)',
  error:         '#a82820',
  errorBg:       'rgba(168,40,32,0.10)',
  warning:       '#a06010',
  warningBg:     'rgba(160,96,16,0.10)',
} as const;

/** Pixel font stack (requires --font-pixel CSS variable set by StudioPage). */
export const PIXEL_FONT = 'var(--font-pixel, ui-monospace, monospace)';
