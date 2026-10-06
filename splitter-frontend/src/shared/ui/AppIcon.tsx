import React from 'react';
import { Platform } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';

type LucideLike = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type Props = {
  /** SF Symbol used on iOS */
  sf: SFSymbol;
  /** lucide icon used on Android / web */
  fallback: LucideLike;
  size?: number;
  /** a resolved color (not a Tamagui token): SF Symbols need a real color */
  color: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
};

/** SF Symbols on iOS (crisp, system look), lucide elsewhere. */
export default function AppIcon({ sf, fallback: Fallback, size = 22, color, weight = 'regular' }: Props) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf} size={size} tintColor={color} weight={weight} fallback={<Fallback size={size} color={color} />} />;
  }
  return <Fallback size={size} color={color} strokeWidth={weight === 'semibold' || weight === 'bold' ? 2.4 : 2} />;
}
