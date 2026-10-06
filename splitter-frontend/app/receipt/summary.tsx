import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Share, Switch } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { XStack, YStack } from 'tamagui';
import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import UserAvatar from '@/shared/ui/UserAvatar';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import { currencyDecimals, toMinor } from '@/features/receipt/lib/split';
import { formatMoney } from '@/features/receipt/lib/money';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import FlowScreen from '@/features/receipt/ui/FlowScreen';
import { useCloseReceiptFlow } from '@/features/receipt/model/close-flow';
import { queryClient } from '@/shared/config/query-client';
import { useSetPaid } from '@/features/balances/model/queries';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { haptic } from '@/shared/lib/haptics';
import { toast } from '@/shared/ui/Toast';
import { errorMessage } from '@/shared/lib/utils/error-message';

/** Step 5: the result. Who owes what (expandable), the total, Share and Done. */
export default function SummaryScreen() {
  const { t, i18n } = useTranslation();
  const meId = useAppStore((s) => s.user?.uniqueId);
  const finalized = useReceiptSessionStore((s) => s.finalized);
  const participants = useReceiptSessionStore((s) => s.participants);
  const reset = useReceiptSessionStore((s) => s.reset);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // settle up right away: "Paid" per person (the creator is never owed by themselves)
  const [paid, setPaidState] = useState<Record<string, boolean>>({});
  const setPaid = useSetPaid();
  const { colors } = useAppTheme();
  const togglePaid = (uniqueId: string, value: boolean) => {
    if (!finalized) return;
    haptic.select();
    setPaidState((p) => ({ ...p, [uniqueId]: value }));
    setPaid.mutate(
      { sessionId: finalized.sessionId, uniqueId, paid: value },
      {
        onSuccess: (res) => setPaidState(Object.fromEntries(Object.entries(res.payments).map(([k, v]) => [k, !!v]))),
        onError: (e) => {
          setPaidState((p) => ({ ...p, [uniqueId]: !value }));
          toast.error(errorMessage(t, e));
        },
      }
    );
  };

  const avatarOf = useMemo(() => new Map(participants.map((p) => [p.uniqueId, p.avatarUrl ?? null])), [participants]);

  const close = useCloseReceiptFlow();
  useEffect(() => {
    if (!finalized) close();
  }, [finalized, close]);
  if (!finalized) return null;

  const currency = finalized.currency || finalized.totals.currency;
  const dec = currencyDecimals(currency);
  const people = finalized.totals.byParticipant;
  const grand = finalized.totals.grandTotal;
  const sumMinor = people.reduce((s, p) => s + toMinor(p.amountOwed, dec), 0);
  const addsUp = sumMinor === toMinor(grand, dec);
  const date = new Date(finalized.finalizedAt).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' });
  const title = finalized.sessionName || t('receipt.summary.untitled', 'Bill');

  const shareText = [
    `${title} · ${date}`,
    `${t('receipt.summary.total', 'Total')}: ${formatMoney(grand, currency)}`,
    '',
    ...people.map((p) => `• ${p.uniqueId === meId ? t('receipt.people.you', 'You') : p.username}: ${formatMoney(p.amountOwed, currency)}`),
  ].join('\n');

  const share = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !(navigator as any).share) throw new Error('no web share');
      await Share.share({ message: shareText });
    } catch {
      // no share sheet (web): copy the summary instead
      try {
        await Clipboard.setStringAsync(shareText);
        toast.success(t('receipt.summary.copied', 'Summary copied'));
      } catch {
        /* nothing else to try */
      }
    }
  };

  const done = () => {
    reset(); // clears the saved draft too
    useSessionsHistoryStore.getState().forceRefresh().catch(() => undefined); // so the new bill shows up in history
    void queryClient.invalidateQueries({ queryKey: ['balances'] });
    close();
  };

  return (
    <FlowScreen
      step="summary"
      footer={
        <>
          <Button title={t('receipt.summary.share', 'Share')} variant="outline" size="large" onPress={share} />
          <Button title={t('receipt.summary.done', 'Done')} variant="primary" size="large" onPress={done} />
        </>
      }
    >
      <YStack backgroundColor="$surface" borderRadius={16} p="$4" gap="$1" ai="center">
        <Text fontSize={14} color="$textMuted" numberOfLines={1}>
          {title} · {date}
        </Text>
        <Text fontSize={32} fontWeight="800" color="$text" accessibilityLabel={`${t('receipt.summary.total', 'Total')}: ${formatMoney(grand, currency)}`}>
          {formatMoney(grand, currency)}
        </Text>
        <Text fontSize={13} color={addsUp ? '$success' : '$danger'}>
          {addsUp ? t('receipt.summary.addsUp', 'Every share adds up to the total') : t('receipt.summary.mismatch', 'Shares do not add up to the total')}
        </Text>
      </YStack>

      <YStack gap="$2">
        {people.map((p) => {
          const isOpen = !!open[p.uniqueId];
          const name = p.uniqueId === meId ? t('receipt.people.you', 'You') : p.username;
          return (
            <YStack key={p.uniqueId} backgroundColor="$surface" borderRadius={16} overflow="hidden">
              <Pressable
                onPress={() => setOpen((o) => ({ ...o, [p.uniqueId]: !o[p.uniqueId] }))}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${name}, ${formatMoney(p.amountOwed, currency)}`}
              >
                <XStack ai="center" gap="$3" minHeight={72} px="$4" py="$3">
                  <UserAvatar uri={avatarOf.get(p.uniqueId)} label={p.username} seed={p.uniqueId} size={48} />
                  <YStack f={1} ai="flex-start">
                    <Text fontSize={17} fontWeight="700" color="$text" numberOfLines={1}>
                      {name}
                    </Text>
                    <Text fontSize={12} color="$textMuted">
                      {isOpen ? t('receipt.summary.hide', 'Hide details') : t('receipt.summary.show', 'What they had')}
                    </Text>
                  </YStack>
                  <Text fontSize={20} fontWeight="800" color="$text">
                    {formatMoney(p.amountOwed, currency)}
                  </Text>
                  {isOpen ? <ChevronUp size={18} color="$textSubtle" /> : <ChevronDown size={18} color="$textSubtle" />}
                </XStack>
              </Pressable>
              {p.uniqueId !== meId && p.amountOwed > 0 && (
                <XStack ai="center" jc="space-between" px="$4" pb="$3" gap="$3">
                  <Text variant="subheadline" color={paid[p.uniqueId] ? '$success' : '$textMuted'}>
                    {paid[p.uniqueId] ? t('settle.paid') : t('settle.notPaid')}
                  </Text>
                  <Switch
                    value={!!paid[p.uniqueId]}
                    onValueChange={(v) => togglePaid(p.uniqueId, v)}
                    trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
                    accessibilityLabel={t('settle.paidA11y', { name })}
                  />
                </XStack>
              )}
              {isOpen && (
                <YStack px="$4" pb="$3" gap="$1.5" borderTopWidth={1} borderColor="$borderColor" pt="$3">
                  {(p.lines ?? []).map((l, i) => (
                    <XStack key={`${l.itemId}-${i}`} jc="space-between" gap="$3">
                      <Text fontSize={14} color={l.kind === 'item' ? '$text' : '$textMuted'} f={1} numberOfLines={2}>
                        {l.units && l.units > 1 ? `${l.units} × ` : ''}
                        {l.name}
                      </Text>
                      <Text fontSize={14} fontWeight="600" color={l.amount < 0 ? '$success' : '$text'}>
                        {formatMoney(l.amount, currency)}
                      </Text>
                    </XStack>
                  ))}
                </YStack>
              )}
            </YStack>
          );
        })}
      </YStack>
    </FlowScreen>
  );
}
