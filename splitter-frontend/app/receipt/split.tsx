import React, { useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Banner from '@/shared/ui/Banner';
import Section from '@/shared/ui/Section';
import TextLink from '@/shared/ui/TextLink';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { currencyDecimals, fromMinor } from '@/features/receipt/lib/split';
import { formatMoney } from '@/features/receipt/lib/money';
import { runSplit } from '@/features/receipt/lib/draft';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { errorCodeOf } from '@/features/auth/model/auth-errors';
import { isStaleSession, receiptErrorMessage, unassignedItemIds } from '@/features/receipt/model/receipt-errors';
import FlowScreen from '@/features/receipt/ui/FlowScreen';
import ItemSplitCard from '@/features/receipt/ui/split/ItemSplitCard';
import TotalsBar from '@/features/receipt/ui/split/TotalsBar';
import AppIcon from '@/shared/ui/AppIcon';
import { Appear } from '@/shared/ui/motion';

/** Step 4: assign every item to people. The totals bar shows the running result; Finish unlocks when all is assigned. */
export default function SplitScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const meId = useAppStore((s) => s.user?.uniqueId);

  const items = useReceiptSessionStore((s) => s.items);
  const participants = useReceiptSessionStore((s) => s.participants);
  const currency = useReceiptSessionStore((s) => s.currency);
  const feeMode = useReceiptSessionStore((s) => s.feeMode);
  const toggleAssignee = useReceiptSessionStore((s) => s.toggleAssignee);
  const setSplitMode = useReceiptSessionStore((s) => s.setSplitMode);
  const changeCount = useReceiptSessionStore((s) => s.changeCount);
  const splitAllEqually = useReceiptSessionStore((s) => s.splitAllEqually);
  const clearAssignments = useReceiptSessionStore((s) => s.clearAssignments);
  const setFeeMode = useReceiptSessionStore((s) => s.setFeeMode);
  const finalize = useReceiptSessionStore((s) => s.finalize);

  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<{ message: string; network: boolean; stale: boolean } | null>(null);
  // items the server reported as not assigned (shown highlighted like the local "Not assigned" state)
  const [serverUnassigned, setServerUnassigned] = useState<string[]>([]);
  const [feeInfo, setFeeInfo] = useState(false);
  const reset = useReceiptSessionStore((s) => s.reset);

  // any edit makes the server's old verdict obsolete
  useEffect(() => setServerUnassigned([]), [items]);

  const dec = currencyDecimals(currency);
  const ids = useMemo(() => participants.map((p) => p.uniqueId), [participants]);
  const result = useMemo(() => runSplit(items, ids, currency, feeMode), [items, ids, currency, feeMode]);

  const purchased = items.filter((i) => i.kind === 'item');
  const adjustments = items.filter((i) => i.kind !== 'item');
  const incomplete = new Set([...result.incompleteItemIds, ...serverUnassigned]);

  // per-item share preview: itemId -> uniqueId -> major units
  const sharesByItem = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const person of result.people) {
      for (const line of person.lines) {
        (map[line.lineId] ??= {})[person.uniqueId] = fromMinor(line.amountMinor, dec);
      }
    }
    return map;
  }, [result, dec]);

  const totals = useMemo(() => Object.fromEntries(result.people.map((p) => [p.uniqueId, fromMinor(p.totalMinor, dec)])), [result, dec]);
  const unassignedAmount = fromMinor(result.unassignedMinor, dec);
  const canFinish = result.complete && purchased.length > 0 && !finishing;

  const finish = async () => {
    if (!canFinish) return;
    setFinishing(true);
    setError(null);
    setServerUnassigned([]);
    try {
      await finalize();
      router.replace('/receipt/summary');
    } catch (e) {
      const missing = unassignedItemIds(e);
      if (missing.length) setServerUnassigned(missing);
      setError({
        message: missing.length ? t('receipt.split.itemsLeft') : receiptErrorMessage(t, e),
        network: errorCodeOf(e) === 'NETWORK',
        stale: isStaleSession(e),
      });
    } finally {
      setFinishing(false);
    }
  };

  const startNew = () => {
    reset();
    router.replace('/receipt/scan');
  };

  return (
    <FlowScreen
      step="split"
      footer={
        <>
          <TotalsBar participants={participants} totals={totals} unassigned={unassignedAmount} currency={currency} meId={meId} left={result.complete ? 0 : result.incompleteItemIds.length} />
          {!!error && (
            <Banner
              kind="error"
              message={error.message}
              {...(error.network
                ? { actionLabel: t('common.retry', 'Retry'), onAction: finish, actionLoading: finishing }
                : error.stale
                  ? { actionLabel: t('receipt.split.newReceipt', 'Start a new receipt'), onAction: startNew }
                  : {})}
            />
          )}
          <Button
            title={t('receipt.split.finish', 'Finish')}
            icon={<AppIcon name="check" size={20} color={canFinish ? '$onPrimary' : '$textSubtle'} weight="semibold" />}
            accessibilityLabel={result.complete ? t('receipt.split.finish', 'Finish') : `${t('receipt.split.finish', 'Finish')}, ${t('receipt.split.finishHint', { count: result.incompleteItemIds.length })}`}
            variant="primary"
            size="large"
            onPress={finish}
            disabled={!canFinish}
            loading={finishing}
          />
        </>
      }
    >
      <XStack gap="$3" ai="center" jc="space-between">
        <Button title={t('receipt.split.equalAll', 'Split everything equally')} variant="secondary" size="medium" onPress={splitAllEqually} />
        <TextLink title={t('receipt.split.clear', 'Clear')} onPress={clearAssignments} align="right" />
      </XStack>

      {purchased.map((item, i) => (
        <Appear key={item.id} index={i}>
        <ItemSplitCard
          key={item.id}
          item={item}
          currency={currency}
          participants={participants}
          meId={meId}
          shares={sharesByItem[item.id] ?? {}}
          unassigned={incomplete.has(item.id)}
          onToggle={(uid) => toggleAssignee(item.id, uid)}
          onSetMode={(mode) => setSplitMode(item.id, mode)}
          onCount={(uid, delta) => changeCount(item.id, uid, delta)}
        />
        </Appear>
      ))}

      {adjustments.length > 0 && (
        <Section title={t('receipt.split.extras', 'Fees, tax and discounts')}>
          {adjustments.map((a) => (
            <XStack key={a.id} jc="space-between" ai="center" minHeight={32} gap="$3">
              <Text fontSize={14} color="$text" f={1} numberOfLines={2}>
                {a.name}
              </Text>
              <Text fontSize={14} fontWeight="700" color={a.totalPrice < 0 ? '$success' : '$text'}>
                {formatMoney(a.totalPrice, currency)}
              </Text>
            </XStack>
          ))}
          <XStack backgroundColor="$surfaceAlt" borderRadius={12} p={3} accessibilityRole="radiogroup">
            {(['proportional', 'equal'] as const).map((m) => (
              <Pressable key={m} onPress={() => setFeeMode(m)} accessibilityRole="radio" accessibilityState={{ selected: feeMode === m }} style={{ flex: 1 }}>
                <YStack minHeight={40} ai="center" jc="center" borderRadius={10} backgroundColor={feeMode === m ? '$surface' : 'transparent'}>
                  <Text fontSize={14} fontWeight={feeMode === m ? '700' : '500'} color={feeMode === m ? '$text' : '$textMuted'}>
                    {t(`receipt.split.feeMode.${m}`, m)}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>
          {/* what the mode means: behind the info button */}
          <XStack ai="center" jc="flex-end">
            <Pressable
              onPress={() => setFeeInfo((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: feeInfo }}
              accessibilityLabel={t('receipt.split.feeModeInfo', 'How fees are split')}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}
            >
              <AppIcon name="info" size={16} color="$textMuted" />
            </Pressable>
          </XStack>
          {feeInfo && (
            <Appear>
              <Text fontSize={12} color="$textMuted">
                {t(`receipt.split.feeModeHint.${feeMode}`, '')}
              </Text>
            </Appear>
          )}
        </Section>
      )}
    </FlowScreen>
  );
}
