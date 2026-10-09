import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import UserAvatar from '@/shared/ui/UserAvatar';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import { currencyDecimals, toMinor } from '@/features/receipt/lib/split';
import { formatMoney } from '@/features/receipt/lib/money';
import { shortDate } from '@/shared/lib/utils/time';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import FlowScreen from '@/features/receipt/ui/FlowScreen';
import { useCloseReceiptFlow } from '@/features/receipt/model/close-flow';
import { queryClient } from '@/shared/config/query-client';
import { useSetPaid } from '@/features/balances/model/queries';
import { haptic } from '@/shared/lib/haptics';
import { toast } from '@/shared/ui/Toast';
import { errorMessage } from '@/shared/lib/utils/error-message';
import AppIcon from '@/shared/ui/AppIcon';
import Money from '@/shared/ui/Money';
import StatusChip from '@/shared/ui/StatusChip';
import CheckToggle from '@/shared/ui/CheckToggle';
import { Appear, PressableScale, SuccessCheck } from '@/shared/ui/motion';

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
  const date = shortDate(finalized.finalizedAt, i18n.language);
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
          <Button title={t('receipt.summary.share', 'Share')} icon={<AppIcon name="share" size={18} color="$primaryText" />} variant="outline" size="large" onPress={share} />
          <Button title={t('receipt.summary.done', 'Done')} icon={<AppIcon name="check" size={20} color="$onPrimary" weight="semibold" />} variant="primary" size="large" onPress={done} />
        </>
      }
    >
      {/* success: the check draws itself, the total counts up */}
      <YStack backgroundColor="$surface" borderRadius={16} p="$4" gap="$2" ai="center">
        <SuccessCheck size={56} withHaptic accessibilityLabel={t('receipt.summary.saved', 'Saved')} />
        <Text fontSize={14} color="$textMuted" numberOfLines={1}>
          {title} · {date}
        </Text>
        <Money
          amount={grand}
          currency={currency}
          fontSize={32}
          fontWeight="800"
          color="$text"
          ta="center"
          animated
          fromZero
          accessibilityLabel={`${t('receipt.summary.total', 'Total')}: ${formatMoney(grand, currency)}`}
        />
        <StatusChip
          icon={addsUp ? 'checkCircle' : 'warning'}
          tone={addsUp ? 'success' : 'danger'}
          label={addsUp ? t('receipt.summary.addsUp', 'Adds up') : t('receipt.summary.mismatch', "Doesn't add up")}
        />
      </YStack>

      <YStack gap="$2">
        {people.map((p, idx) => {
          const isOpen = !!open[p.uniqueId];
          const name = p.uniqueId === meId ? t('receipt.people.you', 'You') : p.username;
          return (
            <Appear key={p.uniqueId} index={idx + 1}>
            <YStack backgroundColor="$surface" borderRadius={16} overflow="hidden">
              <PressableScale
                scaleTo={0.98}
                onPress={() => setOpen((o) => ({ ...o, [p.uniqueId]: !o[p.uniqueId] }))}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${name}, ${formatMoney(p.amountOwed, currency)}`}
                accessibilityHint={isOpen ? t('receipt.summary.hide', 'Hide details') : t('receipt.summary.show', 'What they had')}
              >
                <XStack ai="center" gap="$3" minHeight={72} px="$4" py="$3">
                  <UserAvatar uri={avatarOf.get(p.uniqueId)} label={p.username} seed={p.uniqueId} size={48} />
                  <Text fontSize={17} fontWeight="700" color="$text" numberOfLines={1} f={1} minWidth={0}>
                    {name}
                  </Text>
                  <Money amount={p.amountOwed} currency={currency} fontSize={20} fontWeight="800" color="$text" />
                  {/* expand / collapse "what they had": the chevron says it */}
                  <AppIcon name={isOpen ? 'chevronUp' : 'chevronDown'} size={18} color="$textSubtle" />
                </XStack>
              </PressableScale>
              {p.uniqueId !== meId && p.amountOwed > 0 && (
                <XStack ai="center" jc="space-between" px="$4" pb="$2" gap="$3">
                  {paid[p.uniqueId] ? (
                    <StatusChip icon="checkCircle" tone="success" label={t('settle.paid')} />
                  ) : (
                    <StatusChip icon="pending" tone="warning" label={t('settle.notPaid')} />
                  )}
                  <CheckToggle
                    value={!!paid[p.uniqueId]}
                    onChange={(v) => togglePaid(p.uniqueId, v)}
                    accessibilityLabel={t('settle.paidA11y', { name })}
                    accessibilityHint={t('settle.footerCreator')}
                  />
                </XStack>
              )}
              {isOpen && (
                <Appear>
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
                </Appear>
              )}
            </YStack>
            </Appear>
          );
        })}
      </YStack>
    </FlowScreen>
  );
}
