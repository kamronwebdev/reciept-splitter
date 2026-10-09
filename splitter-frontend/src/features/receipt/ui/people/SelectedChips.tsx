import React from 'react';
import { Pressable } from 'react-native';
import { XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/shared/ui/UserAvatar';
import { Text } from '@/shared/ui/typography';
import type { Candidate } from './PersonRow';
import AppIcon from '@/shared/ui/AppIcon';
import Animated from 'react-native-reanimated';
import { listEntering, listExiting, listLayout } from '@/shared/ui/motion';

/** Selected people as removable chips (you cannot remove yourself). Chips fade in / out and the rest reflow smoothly. */
export default function SelectedChips({ people, onRemove }: { people: Candidate[]; onRemove: (uniqueId: string) => void }) {
  const { t } = useTranslation();
  return (
    <XStack flexWrap="wrap" gap="$2">
      {people.map((p) => {
        const name = p.isMe ? t('receipt.people.you', 'You') : p.username;
        return (
          <Animated.View key={p.uniqueId} layout={listLayout} entering={listEntering} exiting={listExiting}>
          <Pressable
            disabled={!!p.isMe}
            onPress={() => onRemove(p.uniqueId)}
            accessibilityRole="button"
            accessibilityLabel={p.isMe ? name : t('receipt.people.remove', { name, defaultValue: 'Remove {{name}}' })}
            hitSlop={4}
          >
            <XStack ai="center" gap="$2" minHeight={44} pl="$1.5" pr={p.isMe ? '$3' : '$2'} backgroundColor="$surfaceAlt" borderRadius={22}>
              <UserAvatar uri={p.avatarUrl} label={p.username} seed={p.uniqueId} size={32} />
              <Text fontSize={14} fontWeight="600" color="$text" numberOfLines={1} maxWidth={110}>
                {name}
              </Text>
              {!p.isMe && <AppIcon name="close" size={16} color="$textMuted" />}
            </XStack>
          </Pressable>
          </Animated.View>
        );
      })}
    </XStack>
  );
}
