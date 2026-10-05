import React from 'react';
import { Text as TText, Paragraph as TParagraph, Button as TButton } from 'tamagui';
import type { TextProps, ParagraphProps, ButtonProps } from 'tamagui';
import appConfig from '../../../tamagui.config';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { fontFace } from '@/shared/theme/fonts';
import { TEXT_SCALE_VALUE } from '@/shared/theme/types';

/**
 * Text components that follow the user's font and text-size settings.
 *
 * Every screen imports Text / Paragraph / Button from here instead of 'tamagui', so changing the
 * font or size in Settings re-renders all text instantly (they subscribe to the store).
 * Japanese keeps the system font (the bundled fonts have no Japanese glyphs).
 */

const BODY_SIZES = (appConfig.fonts.body as any).size as Record<string, number>;
const MAX_FONT_MULTIPLIER = 1.4; // OS accessibility scaling can still apply, but is capped so layouts hold

function useTypography() {
  const fontFamily = useAppStore((s) => s.fontFamily);
  const textScale = useAppStore((s) => s.textScale);
  const language = useAppStore((s) => s.language);
  return { family: language === 'ja' ? null : fontFamily, scale: TEXT_SCALE_VALUE[textScale] };
}

function sizeToPx(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.startsWith('$')) return BODY_SIZES[v.slice(1)];
  return undefined;
}

type Typo = { family: ReturnType<typeof useTypography>['family']; scale: number };

export function applyTypography<P extends Record<string, any>>(
  props: P,
  { family, scale }: Typo,
  opts: { defaultWeight?: number; scaleSizeProp?: boolean } = {}
): P {
  const out: Record<string, any> = { ...props };

  if (family && out.fontFamily === undefined && out.ff === undefined) {
    const weight = out.fontWeight ?? out.fow ?? opts.defaultWeight ?? 400;
    out.fontFamily = fontFace(family, weight);
    out.fontWeight = '400'; // the weight is already part of the face name
    delete out.fow;
  }

  if (scale !== 1) {
    const base = sizeToPx(out.fontSize ?? out.fos ?? (opts.scaleSizeProp ? out.size : undefined)) ?? BODY_SIZES.true ?? 14;
    const scaled = Math.round(base * scale * 10) / 10;
    out.fontSize = scaled;
    delete out.fos;
    if (opts.scaleSizeProp) delete out.size; // Paragraph: size token -> explicit size
    const lh = out.lineHeight ?? out.lh;
    out.lineHeight = typeof lh === 'number' ? Math.round(lh * scale) : Math.round(scaled * 1.35);
    delete out.lh;
  }

  if (out.maxFontSizeMultiplier === undefined) out.maxFontSizeMultiplier = MAX_FONT_MULTIPLIER;
  return out as P;
}

export const Text = React.forwardRef<any, TextProps>(function Text(props, ref) {
  const typo = useTypography();
  return <TText ref={ref} {...applyTypography(props as any, typo)} />;
});

export const Paragraph = React.forwardRef<any, ParagraphProps>(function Paragraph(props, ref) {
  const typo = useTypography();
  return <TParagraph ref={ref} {...applyTypography(props as any, typo, { scaleSizeProp: true })} />;
});

/** Tamagui Button whose label follows the font/size settings (height/padding keep their `size`). */
export const Button = React.forwardRef<any, ButtonProps>(function Button(props, ref) {
  const { family, scale } = useTypography();
  const out: Record<string, any> = { ...props };
  if (family && out.fontFamily === undefined) {
    out.fontFamily = fontFace(family, out.fontWeight ?? out.fow ?? 600);
    out.fontWeight = '400';
    delete out.fow;
  }
  if (scale !== 1) {
    const base = sizeToPx(out.fontSize ?? out.fos ?? out.size) ?? BODY_SIZES['4'] ?? 14;
    out.fontSize = Math.round(base * scale * 10) / 10;
    delete out.fos;
  }
  return <TButton ref={ref} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER} {...(out as ButtonProps)} />;
});

/** For raw RN components and shared inputs: the face/size to use for a given weight and base size. */
export function useTextStyle(weight: number = 400, baseSize: number = 16) {
  const { family, scale } = useTypography();
  return {
    ...(family ? { fontFamily: fontFace(family, weight) } : {}),
    fontSize: Math.round(baseSize * scale * 10) / 10,
  };
}
