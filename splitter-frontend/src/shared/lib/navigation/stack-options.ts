import { Platform } from 'react-native';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { useTextStyle } from '@/shared/ui/typography';

/**
 * Native-stack options shared by every tab: iOS large titles on root screens, standard back button with
 * swipe-back, hairline-free headers on the grouped background, titles in the app font.
 */
export function useStackOptions() {
  const { colors } = useAppTheme();
  const title = useTextStyle(600, 17);
  const large = useTextStyle(700, 34);
  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.groupedBackground },
    headerTintColor: colors.primaryText,
    headerTitleStyle: { ...title, color: colors.text },
    headerLargeTitleStyle: { ...large, color: colors.text },
    headerLargeTitleShadowVisible: false,
    headerLargeStyle: { backgroundColor: colors.groupedBackground },
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: colors.groupedBackground },
    ...(Platform.OS === 'ios' ? { headerBlurEffect: 'systemChromeMaterial' as const, headerTransparent: false } : {}),
  };
}

/** Root screen of a tab: a large title on iOS. */
export const LARGE_TITLE = { headerLargeTitle: Platform.OS === 'ios' } as const;
