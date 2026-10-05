import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Check, Lock } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/shared/ui/UserAvatar';
import { Text } from '@/shared/ui/typography';

export type Candidate = { uniqueId: string; username: string; avatarUrl?: string | null; isMe?: boolean };

/** "#1234" -> "@1234" style handle. */
export function handleOf(uniqueId: string): string {
  return `@${uniqueId.replace(/^#/, '')}`;
}

type Props = { person: Candidate; selected: boolean; onToggle: () => void };

/** Avatar, name, @id and a clear checkbox. 60pt tall, the whole row is the touch target. */
export default function PersonRow({ person, selected, onToggle }: Props) {
  const { t } = useTranslation();
  const name = person.isMe ? t('receipt.people.you', 'You') : person.username;
  return (
    <Pressable
      onPress={person.isMe ? undefined : onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !!person.isMe }}
      accessibilityLabel={`${name} ${handleOf(person.uniqueId)}`}
      style={({ pressed }) => ({ opacity: pressed && !person.isMe ? 0.6 : 1 })}
    >
      <XStack ai="center" gap="$3" minHeight={60} px="$4" py="$2" backgroundColor="$surface">
        <UserAvatar uri={person.avatarUrl} label={person.username} seed={person.uniqueId} size={44} />
        <YStack f={1}>
          <Text fontSize={16} fontWeight="600" color="$text" numberOfLines={1}>
            {name}
          </Text>
          <Text fontSize={13} color="$textMuted" numberOfLines={1}>
            {person.isMe ? `${person.username} · ${handleOf(person.uniqueId)}` : handleOf(person.uniqueId)}
          </Text>
        </YStack>
        <YStack w={28} h={28} br={8} ai="center" jc="center" backgroundColor={selected ? '$primary' : 'transparent'} borderWidth={selected ? 0 : 2} borderColor="$borderColor">
          {selected && (person.isMe ? <Lock size={14} color="$onPrimary" /> : <Check size={18} color="$onPrimary" />)}
        </YStack>
      </XStack>
    </Pressable>
  );
}
