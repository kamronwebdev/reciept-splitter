/**
 * The one spacing scale (8pt grid with a 4/12 half-step). Use these instead of ad-hoc numbers.
 * Tamagui tokens with the same values: $1 = 4, $2 = 8, $3 = 12, $4 = 16, $6 = 24, $8 = 32.
 */
export const SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

/** Side margin of every screen. */
export const SCREEN_MARGIN = SPACE.l;
/** Vertical gap between sections on every screen. */
export const SECTION_GAP = SPACE.xl;

/** Fixed control heights (HIG). */
export const CONTROL_HEIGHT = { large: 50, medium: 44, small: 34, input: 50, row: 44 } as const;
/** Corner radii. */
export const RADIUS = { control: 12, card: 12, sheet: 16, pill: 999 } as const;
