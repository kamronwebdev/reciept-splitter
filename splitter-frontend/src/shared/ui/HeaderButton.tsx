import React from 'react';
import { Platform, Pressable } from 'react-native';
import { Text } from '@/shared/ui/typography';
import AppIcon, { ICON_SIZE, type IconName } from '@/shared/ui/AppIcon';

type Props = { onPress: () => void; accessibilityLabel?: string; disabled?: boolean } & (
  | { title: string; icon?: never }
  | { icon: IconName; title?: never; accessibilityLabel: string }
);

/**
 * The one header action (text like "Cancel" / "Read all", or an icon like the gear): 44pt target, brand tint,
 * vertically centered with the title, and the same inset from the screen edge on every platform.
 */
export default function HeaderButton({ onPress, title, icon, accessibilityLabel, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: title ? 4 : 0,
        // iOS / Android navigation bars add their own inset; the web header does not
        marginHorizontal: Platform.OS === 'web' ? 8 : 0,
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      {icon ? (
        <AppIcon name={icon} size={ICON_SIZE.header} color="$primaryText" />
      ) : (
        <Text variant="body" color="$primaryText" numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
