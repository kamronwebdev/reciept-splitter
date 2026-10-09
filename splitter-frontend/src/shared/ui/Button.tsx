import React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { XStack } from 'tamagui';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { Text } from '@/shared/ui/typography';
import { haptic } from '@/shared/lib/haptics';
import { CONTROL_HEIGHT, RADIUS } from '@/shared/theme/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'danger' | 'plain';

interface CustomButtonProps {
  title: string;
  variant?: ButtonVariant;
  /** small 36pt, medium 44pt, large 50pt (iOS filled button) */
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  /** shows a spinner and blocks presses */
  loading?: boolean;
  icon?: React.ReactNode;
  /** secondary buttons only: allow a long label to wrap to 2 lines instead of shrinking */
  multiline?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
}

const HEIGHT = { small: CONTROL_HEIGHT.small, medium: CONTROL_HEIGHT.medium, large: CONTROL_HEIGHT.large } as const;

/**
 * The app's buttons (iOS style): filled primary, tinted secondary, outline, destructive and plain text.
 * Primary actions give a light haptic tap.
 */
export const Button: React.FC<CustomButtonProps> = ({ title, variant = 'primary', size = 'medium', disabled = false, loading = false, icon, multiline = false, accessibilityLabel, onPress }) => {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;
  const v = variant === 'danger' ? 'destructive' : variant;

  const bg =
    isDisabled && !loading && v !== 'plain' && v !== 'outline'
      ? '$surfaceAlt'
      : v === 'primary'
        ? '$primary'
        : v === 'destructive'
          ? '$danger'
          : v === 'secondary'
            ? '$primarySoft'
            : 'transparent';
  const fg =
    isDisabled && !loading
      ? '$textSubtle'
      : v === 'primary'
        ? '$onPrimary'
        : v === 'destructive'
          ? '#FFFFFF'
          : '$primaryText';
  const spinner = v === 'primary' ? colors.onPrimary : v === 'destructive' ? '#FFFFFF' : colors.primaryText;

  return (
    <Pressable
      onPress={
        isDisabled
          ? undefined
          : () => {
              if (v === 'primary' || v === 'destructive') haptic.tap();
              onPress?.();
            }
      }
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {({ pressed }) => (
        <XStack
          // fixed height per size; a multiline label may grow the button instead of being cut
          minHeight={HEIGHT[size]}
          {...(multiline ? { py: '$2' } : { height: HEIGHT[size] })}
          px={size === 'small' ? '$3' : '$4'}
          borderRadius={RADIUS.control}
          ai="center"
          jc="center"
          gap="$2"
          backgroundColor={bg as any}
          borderWidth={v === 'outline' ? 1 : 0}
          borderColor={isDisabled ? '$borderColor' : '$primary'}
          opacity={pressed ? 0.75 : 1}
        >
          {loading ? <ActivityIndicator color={spinner} /> : icon}
          <Text variant={size === 'small' ? 'subheadline' : 'headline'} color={fg as any} numberOfLines={multiline ? 2 : 1} ta="center" flexShrink={1} fontWeight="600">
            {title}
          </Text>
        </XStack>
      )}
    </Pressable>
  );
};

export default Button;
