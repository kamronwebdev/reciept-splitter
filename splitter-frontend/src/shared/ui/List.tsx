import React from 'react';
import { Pressable, Platform, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { XStack, YStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { haptic } from '@/shared/lib/haptics';
import AppIcon from '@/shared/ui/AppIcon';
import PressableScale from '@/shared/ui/motion/PressableScale';
import Appear, { AppearGroup } from '@/shared/ui/motion/Appear';
import { listExiting, listLayout } from '@/shared/ui/motion/layout';

/**
 * iOS "inset grouped" lists: a section is a rounded card on the grouped background, with an optional
 * small uppercase header above and a footnote below. Rows are >= 44pt, separated by hairlines that start
 * after the leading icon/avatar (like Settings).
 */
type SectionProps = {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  /** right side of the header row (e.g. "See all") */
  headerRight?: React.ReactNode;
  /**
   * Rows are added / removed while the list is on screen (friends, members, requests, items): a removed row
   * fades out and the rest slide into place. Rows need stable keys.
   */
  animateChanges?: boolean;
  /** no entering animation (e.g. rows that re-mount often) */
  still?: boolean;
};

/** Hairlines start where the row text starts (16 + leading element + 12), like iOS. */
function separatorInset(row: unknown): number {
  const props = (row as any)?.props ?? {};
  if (typeof props.inset === 'number') return props.inset;
  const left = props.left;
  if (!left) return 16;
  const size = typeof left?.props?.size === 'number' ? left.props.size : 28;
  return 16 + size + 12;
}

export function ListSection({ header, footer, children, headerRight, animateChanges, still }: SectionProps) {
  const rows = React.Children.toArray(children).filter(Boolean);
  const Wrap = animateChanges ? Animated.View : View;
  return (
    <AppearGroup>
    <YStack gap="$1.5">
      {(!!header || headerRight) && (
        <XStack px="$4" ai="flex-end" jc="space-between" minHeight={20}>
          {!!header && (
            <Text variant="footnote" color="$textMuted" textTransform="uppercase" letterSpacing={0.4} accessibilityRole="header">
              {header}
            </Text>
          )}
          {headerRight}
        </XStack>
      )}
      <YStack backgroundColor="$surface" borderRadius={12} overflow="hidden">
        {rows.map((row, i) => (
          // first paint: rows fade + slide in, 30ms apart (first 8 only); later additions animate on their own
          <Wrap key={(row as any)?.key ?? i} {...(animateChanges ? { layout: listLayout, exiting: listExiting } : {})}>
            <Appear index={i} disabled={!!still}>
              {i > 0 && <YStack height={Platform.OS === 'web' ? 1 : 0.5} backgroundColor="$separator" ml={separatorInset(row)} />}
              {row}
            </Appear>
          </Wrap>
        ))}
      </YStack>
      {!!footer && (
        <Text variant="footnote" color="$textMuted" px="$4">
          {footer}
        </Text>
      )}
    </YStack>
    </AppearGroup>
  );
}

type RowProps = {
  title: string;
  /** a short line, or a small inline element (status chip, icon + count) */
  subtitle?: React.ReactNode;
  /** value shown on the right in gray (e.g. current setting) */
  value?: string | null | undefined;
  /** leading element: icon tile or avatar */
  left?: React.ReactNode;
  /** trailing element instead of value/chevron (switch, badge, button) */
  right?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** shows a chevron (navigation rows) */
  chevron?: boolean;
  destructive?: boolean;
  /** red text without being an action (e.g. danger zone row) */
  tint?: 'primary' | 'danger';
  disabled?: boolean;
  /** separator inset from the left edge (set by the row, read by ListSection) */
  inset?: number;
  accessibilityLabel?: string;
  /** what happens on press / which gestures exist (the explanation that is no longer on screen) */
  accessibilityHint?: string;
  /** title lines (1 in lists: long names truncate) */
  numberOfLines?: number;
  subtitleLines?: number;
};

export function ListRow({
  title,
  subtitle,
  value,
  left,
  right,
  onPress,
  onLongPress,
  chevron,
  destructive,
  tint,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  numberOfLines = 1,
  subtitleLines = 1,
}: RowProps) {
  const color = destructive || tint === 'danger' ? '$danger' : tint === 'primary' ? '$primaryText' : '$text';
  // one axis: everything vertically centered; the text column is the only part that shrinks
  const content = (pressed: boolean) => (
    <XStack minHeight={44} px="$4" py={subtitle ? '$2' : '$2.5'} ai="center" gap="$3" backgroundColor={pressed ? '$surfaceAlt' : 'transparent'} opacity={disabled ? 0.5 : 1}>
      {left}
      <YStack f={1} minWidth={0} flexShrink={1} gap={2} jc="center">
        <Text variant="body" color={color} numberOfLines={numberOfLines} ta="left">
          {title}
        </Text>
        {typeof subtitle === 'string' || typeof subtitle === 'number' ? (
          subtitle !== '' && (
            <Text variant="subheadline" color="$textMuted" numberOfLines={subtitleLines} ta="left">
              {subtitle}
            </Text>
          )
        ) : (
          subtitle ?? null
        )}
      </YStack>
      {!!value && (
        <Text variant="body" color="$textMuted" numberOfLines={1} flexShrink={0} maxWidth="60%" ta="right">
          {value}
        </Text>
      )}
      {right ? <XStack flexShrink={0} ai="center" gap="$2">{right}</XStack> : null}
      {chevron && <AppIcon name="chevronRight" size={16} color="$inactive" />}
    </XStack>
  );
  const textLabel = [title, typeof subtitle === 'string' ? subtitle : null, value].filter(Boolean).join(', ');
  if (!onPress && !onLongPress)
    return accessibilityLabel || accessibilityHint ? (
      <View accessible accessibilityLabel={accessibilityLabel ?? textLabel} accessibilityHint={accessibilityHint}>
        {content(false)}
      </View>
    ) : (
      content(false)
    );
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={
        onPress
          ? () => {
              haptic.select();
              onPress();
            }
          : undefined
      }
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? textLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
    >
      {({ pressed }) => content(pressed)}
    </PressableScale>
  );
}

/** Small text action on the right of a section header ("See all"). */
export function HeaderLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={title}>
      {({ pressed }) => (
        <Text variant="subheadline" color="$primaryText" opacity={pressed ? 0.6 : 1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

/** Fixed 28pt slot for a leading row icon (outline, no colored tile), so row texts line up. */
export function IconTile({ children }: { children: React.ReactNode; color?: string }) {
  return (
    <YStack width={28} height={28} ai="center" jc="center">
      {children}
    </YStack>
  );
}
