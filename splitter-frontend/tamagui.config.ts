// tamagui.config.ts
import { createTamagui } from '@tamagui/core'
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

const appConfig = createTamagui({
  ...config,
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
