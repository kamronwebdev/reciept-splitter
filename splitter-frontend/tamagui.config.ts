// tamagui.config.ts
import { createTamagui, createTokens } from '@tamagui/core'
import { config } from '@tamagui/config/v3'
import { palettes, type Palette } from './src/shared/theme/palette'

/** Semantic theme values (usable as `$surface`, `$primary`, `$textMuted`, ... in any Tamagui prop). */
function semantic(p: Palette) {
  return {
    background: p.background,
    color: p.text,
    borderColor: p.border,
    surface: p.surface,
    surfaceAlt: p.surfaceAlt,
    border: p.border,
    text: p.text,
    textMuted: p.textMuted,
    textSubtle: p.textSubtle,
    primary: p.primary,
    onPrimary: p.onPrimary,
    primarySoft: p.primarySoft,
    primaryText: p.primaryText,
    danger: p.danger,
    dangerSoft: p.dangerSoft,
    success: p.success,
    warning: p.warning,
    overlay: p.overlay,
    shadowColor: p.shadow,
    groupedBackground: p.groupedBackground,
    separator: p.separator,
    bar: p.bar,
    inactive: p.inactive,
    badge: p.badge,
    onBadge: p.onBadge,
  }
}

/**
 * Space tokens on the app's 8pt grid (4/8/12/16/24/32). The v3 preset uses 2/7/13/18/24/32, which put every
 * `$2`/`$3`/`$4` gap and padding off the grid. Keys stay the same so existing props keep working.
 */
const GRID: Record<string, number> = {
  0: 0, 0.25: 1, 0.5: 2, 0.75: 3, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14, 4: 16, true: 16, 4.5: 20, 5: 24, 6: 32,
  7: 40, 8: 48, 9: 56, 10: 64, 11: 72, 12: 88, 13: 102, 14: 116, 15: 130, 16: 144, 17: 144, 18: 158, 19: 172, 20: 186,
}
const space = Object.fromEntries(
  Object.entries(GRID).flatMap(([k, v]) => (k === '0' ? [[k, v]] : [[k, v], [`-${k}`, -v]]))
)

const appConfig = createTamagui({
  ...config,
  tokens: createTokens({ ...config.tokens, space }),
  themes: {
    ...config.themes,
    light: { ...config.themes.light, ...semantic(palettes.light) },
    dark: { ...config.themes.dark, ...semantic(palettes.dark) },
  },
})

export default appConfig

export type Conf = typeof appConfig

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}
