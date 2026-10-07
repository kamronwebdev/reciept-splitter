import React, { useRef } from 'react';
import { RefreshControl, ScrollView, type ScrollViewProps } from 'react-native';
import { useScrollToTop } from 'expo-router';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { SCREEN_MARGIN, SECTION_GAP, SPACE } from '@/shared/theme/spacing';

type Props = ScrollViewProps & {
  children: React.ReactNode;
  /** grouped (settings-like) background, default true */
  grouped?: boolean;
  /** pull to refresh */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** vertical gap between sections (8pt grid) */
  gap?: number;
};

/**
 * Standard scrolling screen: 16pt margins, 8pt-grid section spacing, grouped background, pull to refresh,
 * scroll-to-top when the active tab is tapped, and correct insets under native large-title headers.
 */
export default function Screen({ children, grouped = true, refreshing, onRefresh, gap = SECTION_GAP, contentContainerStyle, ...rest }: Props) {
  const { colors } = useAppTheme();
  const ref = useRef<ScrollView>(null);
  useScrollToTop(ref);
  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1, backgroundColor: grouped ? colors.groupedBackground : colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ padding: SCREEN_MARGIN, paddingBottom: SPACE.xxl, gap }, contentContainerStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} colors={[colors.primary]} /> : undefined}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
