import React from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import AppIcon from '@/shared/ui/AppIcon';

export type MessageAction = { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'outline'; loading?: boolean };

type Props = {
  kind: 'error' | 'permission';
  title: string;
  message: string;
  actions: MessageAction[];
};

/** Friendly full-screen message (scan error or camera permission) with clear next actions. */
export default function MessageStage({ kind, title, message, actions }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const icon = kind === 'permission' ? 'cameraOff' : 'warning';
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <YStack ai="center" gap="$3" maxWidth={420} alignSelf="center" w="100%">
        <YStack w={72} h={72} br={36} ai="center" jc="center" backgroundColor="$surfaceAlt">
          <AppIcon name={icon} size={28} color={kind === 'error' ? '$danger' : '$textMuted'} />
        </YStack>
        <Text fontSize={22} fontWeight="800" color="$text" ta="center" accessibilityRole="header">
          {title}
        </Text>
        <Text fontSize={15} color="$textMuted" ta="center">
          {message}
        </Text>
        <YStack w="100%" gap="$2.5" pt="$4">
          {actions.map((a) => (
            <Button key={a.title} title={a.title} variant={a.variant ?? 'outline'} size="large" onPress={a.onPress} {...(a.loading ? { loading: true } : {})} />
          ))}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
