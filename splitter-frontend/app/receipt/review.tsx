import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { Plus } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import Banner from '@/shared/ui/Banner';
import Section from '@/shared/ui/Section';
import TextLink from '@/shared/ui/TextLink';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { draftTotals, totalsDifference, type DraftItem, type DraftKind } from '@/features/receipt/lib/draft';
import { formatMoney } from '@/features/receipt/lib/money';
import FlowScreen from '@/features/receipt/ui/FlowScreen';
import ItemRow from '@/features/receipt/ui/review/ItemRow';
import ItemEditorSheet from '@/features/receipt/ui/review/ItemEditorSheet';
import CurrencySheet from '@/features/receipt/ui/review/CurrencySheet';
import ReceiptThumb from '@/features/receipt/ui/review/ReceiptThumb';

function TotalRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'warn' | 'ok' }) {
  return (
    <XStack jc="space-between" ai="center" minHeight={32} gap="$3">
      <Text fontSize={strong ? 16 : 14} fontWeight={strong ? '700' : '400'} color={strong ? '$text' : '$textMuted'} f={1}>
        {label}
      </Text>
      <Text fontSize={strong ? 18 : 15} fontWeight={strong ? '800' : '600'} color={tone === 'warn' ? '$danger' : tone === 'ok' ? '$success' : '$text'}>
        {value}
      </Text>
    </XStack>
  );
}

/** Step 2: review what was read from the receipt, fix mistakes, add missed lines. */
export default function ReviewItemsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const items = useReceiptSessionStore((s) => s.items);
  const currency = useReceiptSessionStore((s) => s.currency);
  const sessionName = useReceiptSessionStore((s) => s.sessionName);
  const source = useReceiptSessionStore((s) => s.source);
  const imageUri = useReceiptSessionStore((s) => s.imageUri);
  const receiptGrandTotal = useReceiptSessionStore((s) => s.receiptGrandTotal);
  const setSessionName = useReceiptSessionStore((s) => s.setSessionName);
  const setCurrency = useReceiptSessionStore((s) => s.setCurrency);
  const setReceiptGrandTotal = useReceiptSessionStore((s) => s.setReceiptGrandTotal);
  const addItem = useReceiptSessionStore((s) => s.addItem);
  const updateItem = useReceiptSessionStore((s) => s.updateItem);
  const removeItem = useReceiptSessionStore((s) => s.removeItem);
  const setStep = useReceiptSessionStore((s) => s.setStep);

  const [editor, setEditor] = useState<{ open: boolean; item?: DraftItem; kind: DraftKind }>({ open: false, kind: 'item' });
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const purchased = useMemo(() => items.filter((i) => i.kind === 'item'), [items]);
  const adjustments = useMemo(() => items.filter((i) => i.kind !== 'item'), [items]);
  const totals = useMemo(() => draftTotals(items, currency), [items, currency]);
  const diff = totalsDifference(receiptGrandTotal, totals.computedTotal, currency);
  const mismatch = diff !== null && diff !== 0;

  const openEditor = useCallback((item?: DraftItem, kind: DraftKind = 'item') => setEditor({ open: true, item, kind }), []);
  const closeEditor = useCallback(() => setEditor((e) => ({ ...e, open: false })), []);

  const next = () => {
    setStep('people');
    router.push('/receipt/people');
  };

  return (
    <FlowScreen
      step="items"
      footer={
        <>
          {purchased.length === 0 && (
            <Text fontSize={13} color="$textMuted" ta="center">
              {t('receipt.review.needItem', 'Add at least one item to continue.')}
            </Text>
          )}
          <Button title={t('receipt.review.next', 'Next: choose people')} variant="primary" size="large" onPress={next} disabled={purchased.length === 0} />
        </>
      }
    >
      {source === 'mock' && <Banner kind="info" message={t('receipt.demoBanner', 'Demo data: this is not your receipt.')} />}

      <XStack gap="$3" ai="flex-start">
        {!!imageUri && <ReceiptThumb uri={imageUri} />}
        <YStack f={1}>
          <Input
            label={t('receipt.review.billName', 'Bill name')}
            value={sessionName}
            onChangeText={setSessionName}
            textInputProps={{ returnKeyType: 'done', autoCapitalize: 'sentences' }}
          />
        </YStack>
      </XStack>

      <YStack gap="$2">
        <Text fontSize={13} fontWeight="700" color="$textMuted" textTransform="uppercase" letterSpacing={0.6} accessibilityRole="header">
          {t('receipt.review.items', 'Items')} ({purchased.length})
        </Text>
        <YStack borderRadius={16} overflow="hidden" borderWidth={1} borderColor="$borderColor" backgroundColor="$surface">
          {purchased.length === 0 ? (
            <Text fontSize={14} color="$textMuted" p="$4" ta="center">
              {t('receipt.review.empty', 'No items yet. Add what was bought.')}
            </Text>
          ) : (
            purchased.map((item, idx) => (
              <YStack key={item.id} borderTopWidth={idx === 0 ? 0 : 1} borderColor="$borderColor">
                <ItemRow item={item} currency={currency} onPress={() => openEditor(item)} onDelete={() => removeItem(item.id)} />
              </YStack>
            ))
          )}
        </YStack>
        <Button title={t('receipt.review.addItem', 'Add item')} variant="outline" size="medium" onPress={() => openEditor(undefined, 'item')} />
      </YStack>

      <YStack gap="$2">
        <Text fontSize={13} fontWeight="700" color="$textMuted" textTransform="uppercase" letterSpacing={0.6} accessibilityRole="header">
          {t('receipt.review.extras', 'Fees, tax and discounts')}
        </Text>
        {adjustments.length > 0 && (
          <YStack borderRadius={16} overflow="hidden" borderWidth={1} borderColor="$borderColor" backgroundColor="$surface">
            {adjustments.map((item, idx) => (
              <YStack key={item.id} borderTopWidth={idx === 0 ? 0 : 1} borderColor="$borderColor">
                <ItemRow item={item} currency={currency} onPress={() => openEditor(item)} onDelete={() => removeItem(item.id)} />
              </YStack>
            ))}
          </YStack>
        )}
        <XStack ai="center" gap="$2">
          <Plus size={16} color="$primaryText" />
          <TextLink title={t('receipt.review.addExtra', 'Add fee, tax or discount')} onPress={() => openEditor(undefined, 'fee')} align="left" />
        </XStack>
      </YStack>

      <Section title={t('receipt.review.totals', 'Totals')}>
        <TotalRow label={t('receipt.review.itemsSubtotal', 'Items')} value={formatMoney(totals.itemsTotal, currency)} />
        {totals.feesTotal !== 0 && <TotalRow label={t('receipt.kinds.fee', 'Service / fees')} value={formatMoney(totals.feesTotal, currency)} />}
        {totals.taxTotal !== 0 && <TotalRow label={t('receipt.kinds.tax', 'Tax')} value={formatMoney(totals.taxTotal, currency)} />}
        {totals.discountTotal !== 0 && <TotalRow label={t('receipt.kinds.discount', 'Discount')} value={formatMoney(totals.discountTotal, currency)} />}
        <YStack h={1} backgroundColor="$borderColor" />
        <TotalRow label={t('receipt.review.calculated', 'Calculated total')} value={formatMoney(totals.computedTotal, currency)} strong />
        {receiptGrandTotal !== null && (
          <TotalRow label={t('receipt.review.receiptTotal', 'Total on the receipt')} value={formatMoney(receiptGrandTotal, currency)} tone={mismatch ? 'warn' : 'ok'} />
        )}
        {mismatch && diff !== null && (
          <YStack gap="$2" pt="$1">
            <Banner
              kind="error"
              message={t(diff > 0 ? 'receipt.review.mismatchLess' : 'receipt.review.mismatchMore', {
                amount: formatMoney(Math.abs(diff), currency),
              })}
            />
            <TextLink title={t('receipt.review.useCalculated', 'Use calculated total')} onPress={() => setReceiptGrandTotal(totals.computedTotal)} align="left" />
          </YStack>
        )}
      </Section>

      <Section title={t('receipt.review.currency', 'Currency')}>
        <XStack ai="center" jc="space-between">
          <Text fontSize={16} fontWeight="600" color="$text">
            {currency}
          </Text>
          <TextLink title={t('receipt.review.changeCurrency', 'Change')} onPress={() => setCurrencyOpen(true)} align="right" />
        </XStack>
      </Section>

      <ItemEditorSheet
        visible={editor.open}
        item={editor.item}
        currency={currency}
        initialKind={editor.kind}
        onClose={closeEditor}
        onSave={(v) => {
          if (editor.item) {
            // the form always sends a consistent set of numbers: write them all
            updateItem(editor.item.id, { name: v.name, kind: v.kind, quantity: v.quantity, unitPrice: v.unitPrice, totalPrice: v.totalPrice });
          } else {
            addItem({ name: v.name, kind: v.kind, quantity: v.quantity, unitPrice: v.unitPrice, totalPrice: v.totalPrice });
          }
          closeEditor();
        }}
        onDelete={editor.item ? () => {
          removeItem(editor.item!.id);
          closeEditor();
        } : undefined}
      />
      <CurrencySheet visible={currencyOpen} current={currency} onClose={() => setCurrencyOpen(false)} onPick={setCurrency} />
    </FlowScreen>
  );
}
