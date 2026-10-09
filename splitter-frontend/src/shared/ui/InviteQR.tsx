// src/shared/ui/InviteQR.tsx
import React from 'react';
import { XStack, YStack, Card } from 'tamagui';
import AppIcon from '@/shared/ui/AppIcon';
import { Text } from '@/shared/ui/typography';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import { dateTime } from '@/shared/lib/utils/time';

type Props = {
  url: string;
  title?: string;
  expiresAt?: string; // ISO
  caption?: string;
};

export function InviteQR({ url, title, expiresAt, caption }: Props) {
  const { t, i18n } = useTranslation();
  return (
    <YStack ai="center" gap="$3">
      {!!title && (
        <Text variant="headline" ta="center">
          {title}
        </Text>
      )}

      <Card
        bordered
        elevate={false}
        bw={1}
        bc="$gray5"
        br="$4"
        p="$4"
        bg="#FFFFFF"
      >
        <QRCode value={url} size={260} ecl="M" color="#000000" backgroundColor="#FFFFFF" />
      </Card>

      {/* when it stops working: a clock and the time, no sentence */}
      {(!!caption || !!expiresAt) && (
        <XStack ai="center" gap="$1.5">
          {!!expiresAt && <AppIcon name="clock" size={14} color="$textMuted" />}
          <Text variant="footnote" color="$textMuted">
            {caption ?? t('friends.qr.expiresAt', { time: dateTime(expiresAt!, i18n.language) })}
          </Text>
        </XStack>
      )}
    </YStack>
  );
}
