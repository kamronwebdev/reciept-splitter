import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import BottomSheet from '@/shared/ui/BottomSheet';
import Input from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/typography';
import TextLink from '@/shared/ui/TextLink';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { currencyDecimals } from '../../lib/split';
import { formatMoney, parseAmountInput } from '../../lib/money';
import { lineTotal, roundTo, type DraftItem, type DraftKind } from '../../lib/draft';
import AppIcon from '@/shared/ui/AppIcon';

type Props = {
  visible: boolean;
  /** the item being edited, or undefined when adding a new line */
  item?: DraftItem | undefined;
  currency: string;
  /** which kinds can be picked when adding */
  initialKind?: DraftKind;
  onClose: () => void;
  onSave: (value: { name: string; kind: DraftKind; quantity: number; unitPrice: number; totalPrice: number }) => void;
  onDelete?: () => void;
};

const KINDS: DraftKind[] = ['item', 'fee', 'tax', 'discount'];

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const btn = { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <XStack ai="center" gap="$3" accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: String(value) }}>
      <Pressable onPress={() => onChange(Math.max(1, value - 1))} style={[btn, { backgroundColor: colors.surfaceAlt }]} accessibilityLabel={`${t('common.decrease')}, ${label}`} accessibilityRole="button" disabled={value <= 1}>
        <AppIcon name="minus" size={20} color="$text" />
      </Pressable>
      <Text fontSize={20} fontWeight="700" color="$text" minWidth={36} ta="center">
        {value}
      </Text>
      <Pressable onPress={() => onChange(value + 1)} style={[btn, { backgroundColor: colors.surfaceAlt }]} accessibilityLabel={`${t('common.increase')}, ${label}`} accessibilityRole="button">
        <AppIcon name="plus" size={20} color="$text" />
      </Pressable>
    </XStack>
  );
}

/** Add / edit one receipt line: name, quantity, unit price (the total follows), kind. */
export default function ItemEditorSheet({ visible, item, currency, initialKind = 'item', onClose, onSave, onDelete }: Props) {
  const { t } = useTranslation();
  const dec = currencyDecimals(currency);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<DraftKind>('item');
  const [quantity, setQuantity] = useState(1);
  const [unitText, setUnitText] = useState('');
  const [totalText, setTotalText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // reset the form whenever the sheet opens (once per opening: no loop)
  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (item) {
      setName(item.name);
      setKind(item.kind);
      setQuantity(item.quantity);
      setUnitText(item.kind === 'discount' ? '' : String(roundTo(item.unitPrice, Math.max(dec, 2))));
      setTotalText(String(Math.abs(item.totalPrice)));
    } else {
      setName('');
      setKind(initialKind);
      setQuantity(1);
      setUnitText('');
      setTotalText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item?.id, initialKind]);

  const isItem = kind === 'item';
  const unit = parseAmountInput(unitText);
  const typedTotal = parseAmountInput(totalText);
  const computedTotal = isItem && unit !== null ? lineTotal(unit, quantity, currency) : null;
  // for items the total follows unit x quantity unless the user typed a total themselves
  const total = isItem ? (computedTotal ?? typedTotal) : typedTotal;

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError(t('receipt.review.errors.name', 'Enter a name'));
    if (total === null || total <= 0) return setError(t('receipt.review.errors.price', 'Enter a price greater than zero'));
    const finalQty = isItem ? quantity : 1;
    const finalUnit = isItem ? (unit ?? total / finalQty) : total;
    onSave({ name: trimmed, kind, quantity: finalQty, unitPrice: finalUnit, totalPrice: kind === 'discount' ? -total : total });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} label={item ? t('receipt.review.editItem', 'Edit item') : t('receipt.review.addItem', 'Add item')}>
      <YStack gap="$3" pb="$2">
        <Text fontSize={18} fontWeight="700" ta="center" accessibilityRole="header">
          {item ? t('receipt.review.editItem', 'Edit item') : t('receipt.review.addItem', 'Add item')}
        </Text>

        {!item && (
          <XStack gap="$2" accessibilityRole="radiogroup">
            {KINDS.map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                accessibilityRole="radio"
                accessibilityState={{ selected: kind === k }}
                style={{ flex: 1 }}
              >
                <YStack minHeight={44} ai="center" jc="center" borderRadius={10} borderWidth={kind === k ? 2 : 1} borderColor={kind === k ? '$primary' : '$borderColor'} backgroundColor={kind === k ? '$primarySoft' : '$surface'}>
                  <Text fontSize={13} fontWeight="600" color="$text">
                    {t(`receipt.kinds.${k}`, k)}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>
        )}

        <Input
          label={t('receipt.review.name', 'Name')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          textInputProps={{ autoCapitalize: 'sentences', returnKeyType: 'next', autoFocus: !item }}
        />

        {isItem && (
          <XStack ai="center" jc="space-between" gap="$3">
            <Text fontSize={14} fontWeight="600" color="$textMuted">
              {t('receipt.review.quantity', 'Quantity')}
            </Text>
            <Stepper value={quantity} onChange={setQuantity} label={t('receipt.review.quantity', 'Quantity')} />
          </XStack>
        )}

        {isItem ? (
          <Input
            label={t('receipt.review.unitPrice', 'Price per unit')}
            value={unitText}
            onChangeText={(v) => {
              setUnitText(v);
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder="0"
            textInputProps={{ returnKeyType: 'done' }}
          />
        ) : (
          <Input
            label={t('receipt.review.amount', 'Amount')}
            value={totalText}
            onChangeText={(v) => {
              setTotalText(v);
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder="0"
            hint={kind === 'discount' ? t('receipt.review.discountHint', 'Enter the discount as a positive number') : undefined}
            textInputProps={{ returnKeyType: 'done' }}
          />
        )}

        {isItem && (
          <XStack jc="space-between" ai="center" minHeight={44}>
            <Text fontSize={14} color="$textMuted">
              {t('receipt.review.lineTotal', 'Line total')}
            </Text>
            <Text fontSize={18} fontWeight="800" color="$text">
              {total !== null ? formatMoney(total, currency) : '—'}
            </Text>
          </XStack>
        )}

        {!!error && (
          <Text fontSize={13} color="$danger" accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Button title={t('receipt.review.save', 'Save')} variant="primary" size="large" onPress={save} />
        {item && onDelete && (
          <TextLink title={t('receipt.review.deleteItem', 'Delete item')} onPress={onDelete} danger />
        )}
      </YStack>
    </BottomSheet>
  );
}
