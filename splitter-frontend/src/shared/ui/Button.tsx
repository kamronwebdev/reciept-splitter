import React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { XStack } from 'tamagui';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { Text } from '@/shared/ui/typography';
import { haptic } from '@/shared/lib/haptics';

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
  accessibilityLabel?: string;
  onPress?: () => void;
}

const HEIGHT = { small: 36, medium: 44, large: 50 } as const;

/**
 * The app's buttons (iOS style): filled primary, tinted secondary, outline, destructive and plain text.
 * Primary actions give a light haptic tap.
 */
export const Button: React.FC<CustomButtonProps> = ({ title, variant = 'primary', size = 'medium', disabled = false, loading = false, icon, accessibilityLabel, onPress }) => {
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
          minHeight={Math.max(44, HEIGHT[size])}
          height={size === 'small' ? undefined : HEIGHT[size]}
          px={size === 'small' ? '$3' : '$4'}
          borderRadius={size === 'large' ? 14 : 12}
          ai="center"
          jc="center"
          gap="$2"
          backgroundColor={bg as any}
          borderWidth={v === 'outline' ? 1 : 0}
          borderColor={isDisabled ? '$borderColor' : '$primary'}
          opacity={pressed ? 0.75 : 1}
        >
          {loading ? <ActivityIndicator color={spinner} /> : icon}
          <Text variant={size === 'small' ? 'subheadline' : 'headline'} color={fg as any} numberOfLines={1} fontWeight="600">
            {title}
          </Text>
        </XStack>
      )}
    </Pressable>
  );
};

export default Button;
