import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Check, Minus, Plus } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/shared/ui/UserAvatar';
import { Text } from '@/shared/ui/typography';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { formatMoney } from '../../lib/money';
import { remainingUnits, type DraftItem } from '../../lib/draft';
import type { ReceiptParticipant } from '../../api/receipt.api';

type Props = {
  item: DraftItem;
  currency: string;
  participants: ReceiptParticipant[];
  meId?: string | undefined;
  /** what each person pays for THIS item (minor-unit exact), uniqueId -> amount in major units */
  shares: Record<string, number>;
  unassigned: boolean;
  onToggle: (uniqueId: string) => void;
  onSetMode: (mode: 'equal' | 'count') => void;
  onCount: (uniqueId: string, delta: number) => void;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function ModeSwitch({ mode, onChange }: { mode: 'equal' | 'count'; onChange: (m: 'equal' | 'count') => void }) {
  const { t } = useTranslation();
  return (
    <XStack backgroundColor="$surfaceAlt" borderRadius={12} p={3} accessibilityRole="radiogroup">
      {(['equal', 'count'] as const).map((m) => (
        <Pressable key={m} onPress={() => onChange(m)} accessibilityRole="radio" accessibilityState={{ selected: mode === m }} style={{ flex: 1 }}>
          <YStack minHeight={40} ai="center" jc="center" borderRadius={10} backgroundColor={mode === m ? '$surface' : 'transparent'}>
            <Text fontSize={14} fontWeight={mode === m ? '700' : '500'} color={mode === m ? '$text' : '$textMuted'}>
              {t(`receipt.split.mode.${m}`, m)}
            </Text>
          </YStack>
        </Pressable>
      ))}
    </XStack>
  );
}

/** One card per item: tap avatars to choose who shares it; items with quantity > 1 can be split by count. */
export default function ItemSplitCard({ item, currency, participants, meId, shares, unassigned, onToggle, onSetMode, onCount }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const left = remainingUnits(item);
  const isCount = item.splitMode === 'count' && item.quantity > 1;

  return (
    <YStack
      backgroundColor="$surface"
      borderRadius={16}
      borderWidth={unassigned ? 2 : 1}
      borderColor={unassigned ? '$warning' : '$borderColor'}
      p="$4"
      gap="$3"
    >
      <XStack jc="space-between" ai="flex-start" gap="$3">
        <YStack f={1} gap="$1" ai="flex-start">
          <Text fontSize={16} fontWeight="700" color="$text" numberOfLines={2}>
            {item.name}
          </Text>
          <Text fontSize={13} color="$textMuted">
            {item.quantity > 1 ? `${item.quantity} × ${formatMoney(item.unitPrice, currency)}` : t('receipt.split.single', 'One portion')}
          </Text>
        </YStack>
        <Text fontSize={16} fontWeight="800" color="$text">
          {formatMoney(item.totalPrice, currency)}
        </Text>
      </XStack>

      {unassigned && (
        <XStack alignSelf="flex-start" backgroundColor="$dangerSoft" borderRadius={999} px="$3" minHeight={28} ai="center">
          <Text fontSize={12} fontWeight="700" color="$warning">
            {t('receipt.split.notAssigned', 'Not assigned')}
          </Text>
        </XStack>
      )}

      {item.quantity > 1 && <ModeSwitch mode={isCount ? 'count' : 'equal'} onChange={onSetMode} />}

      {isCount ? (
        <YStack gap="$2">
          <Text fontSize={13} fontWeight="700" color={left === 0 ? '$success' : '$warning'} accessibilityLiveRegion="polite">
            {left === 0
              ? t('receipt.split.allUnits', 'All units assigned')
              : t('receipt.split.remaining', { count: left, defaultValue: 'Remaining: {{count}}' })}
          </Text>
          {participants.map((p) => {
            const n = item.perPersonCount[p.uniqueId] ?? 0;
            const btn = { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt } as const;
            return (
              <XStack key={p.uniqueId} ai="center" gap="$3" minHeight={52}>
                <UserAvatar uri={p.avatarUrl} label={p.username} seed={p.uniqueId} size={36} />
                <Text fontSize={15} fontWeight="600" color="$text" f={1} numberOfLines={1}>
                  {p.uniqueId === meId ? t('receipt.people.you', 'You') : firstName(p.username)}
                </Text>
                {n > 0 && shares[p.uniqueId] !== undefined && (
                  <Text fontSize={13} color="$textMuted">
                    {formatMoney(shares[p.uniqueId]!, currency)}
                  </Text>
                )}
                <Pressable onPress={() => onCount(p.uniqueId, -1)} disabled={n === 0} style={[btn, { opacity: n === 0 ? 0.4 : 1 }]} accessibilityRole="button" accessibilityLabel={`− ${p.username}`}>
                  <Minus size={18} color="$text" />
                </Pressable>
                <Text fontSize={18} fontWeight="800" color="$text" minWidth={24} ta="center">
                  {n}
                </Text>
                <Pressable onPress={() => onCount(p.uniqueId, 1)} disabled={left <= 0} style={[btn, { opacity: left <= 0 ? 0.4 : 1 }]} accessibilityRole="button" accessibilityLabel={`+ ${p.username}`}>
                  <Plus size={18} color="$text" />
                </Pressable>
              </XStack>
            );
          })}
        </YStack>
      ) : (
        <XStack flexWrap="wrap" gap="$2">
          {participants.map((p) => {
            const on = item.assignedTo.includes(p.uniqueId);
            return (
              <Pressable
                key={p.uniqueId}
                onPress={() => onToggle(p.uniqueId)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={p.username}
                style={{ width: 68, minHeight: 76, alignItems: 'center' }}
              >
                <YStack>
                  <YStack w={48} h={48} br={24} ai="center" jc="center" borderWidth={3} borderColor={on ? '$primary' : 'transparent'}>
                    <YStack opacity={on ? 1 : 0.45}>
                      <UserAvatar uri={p.avatarUrl} label={p.username} seed={p.uniqueId} size={40} />
                    </YStack>
                  </YStack>
                  {on && (
                    <YStack position="absolute" right={-2} bottom={-2} w={18} h={18} br={9} ai="center" jc="center" backgroundColor="$primary">
                      <Check size={12} color="$onPrimary" />
                    </YStack>
                  )}
                </YStack>
                <Text fontSize={12} fontWeight={on ? '700' : '500'} color={on ? '$text' : '$textMuted'} numberOfLines={1} maxWidth={64}>
                  {p.uniqueId === meId ? t('receipt.people.you', 'You') : firstName(p.username)}
                </Text>
                {on && shares[p.uniqueId] !== undefined && (
                  <Text fontSize={11} color="$textMuted" numberOfLines={1}>
                    {formatMoney(shares[p.uniqueId]!, currency, { withSymbol: false })}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </XStack>
      )}
    </YStack>
  );
}
