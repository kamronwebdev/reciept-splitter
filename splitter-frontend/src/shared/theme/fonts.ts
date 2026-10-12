import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import type { AppFontFamily } from './types';

/** Every face is loaded at startup so switching the font in Settings is instant. */
export const FONT_ASSETS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
};

export type FontWeightBucket = 400 | 500 | 600 | 700;

const PREFIX: Record<AppFontFamily, string> = { inter: 'Inter', nunito: 'Nunito', manrope: 'Manrope' };
const SUFFIX: Record<FontWeightBucket, string> = {
  400: '400Regular',
  500: '500Medium',
  600: '600SemiBold',
  700: '700Bold',
};

/** 'bold' | '600' | 700 | undefined -> nearest loaded weight */
export function weightBucket(weight: unknown): FontWeightBucket {
  let n = 400;
  if (weight === 'bold') n = 700;
  else if (weight === 'normal' || weight == null) n = 400;
  else if (typeof weight === 'number') n = weight;
  else if (typeof weight === 'string' && /^\d+$/.test(weight)) n = Number(weight);
  if (n <= 450) return 400;
  if (n <= 550) return 500;
  if (n <= 650) return 600;
  return 700;
}

/** Name of the loaded RN font for a family + weight. Custom RN fonts are selected by name, not by fontWeight. */
export function fontFace(family: AppFontFamily, weight?: unknown): string {
  return `${PREFIX[family]}_${SUFFIX[weightBucket(weight)]}`;
}

export const FONT_LABELS: Record<AppFontFamily, string> = {
  inter: 'Inter',
  nunito: 'Nunito',
  manrope: 'Manrope',
};
