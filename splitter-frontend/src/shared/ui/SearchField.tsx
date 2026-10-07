import React from 'react';
import { Pressable, TextInput, type TextInputProps } from 'react-native';
import { XStack } from 'tamagui';
import { Search, XCircle } from '@tamagui/lucide-icons';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { useTextStyle } from '@/shared/ui/typography';

type Props = Omit<TextInputProps, 'style'> & { value: string; onChangeText: (v: string) => void; clearLabel?: string };

/** iOS search field: magnifier, gray rounded fill, clear button. */
export default function SearchField({ value, onChangeText, clearLabel = 'Clear', ...rest }: Props) {
  const { colors } = useAppTheme();
  const text = useTextStyle(400, 17);
  return (
    <XStack ai="center" gap="$2" px="$2.5" minHeight={40} borderRadius={10} backgroundColor="$surfaceAlt">
      <Search size={18} color="$textMuted" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textSubtle}
        style={[{ flex: 1, color: colors.text, paddingVertical: 8, minHeight: 40 }, text]}
        autoCorrect={false}
        clearButtonMode="never"
        returnKeyType="search"
        accessibilityLabel={rest.placeholder}
        maxFontSizeMultiplier={1.4}
        {...rest}
      />
      {!!value && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={clearLabel}>
          <XCircle size={18} color="$textSubtle" />
        </Pressable>
      )}
    </XStack>
  );
}
