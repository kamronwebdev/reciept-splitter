export type ThemeMode = 'system' | 'light' | 'dark';
export type AppFontFamily = 'inter' | 'nunito' | 'manrope';
export type TextScaleKey = 'small' | 'default' | 'large';

export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];
export const FONT_FAMILIES: AppFontFamily[] = ['inter', 'nunito', 'manrope'];
export const TEXT_SCALES: TextScaleKey[] = ['small', 'default', 'large'];

/** multipliers applied to every text size in the app */
export const TEXT_SCALE_VALUE: Record<TextScaleKey, number> = {
  small: 0.9,
  default: 1,
  large: 1.15,
};
