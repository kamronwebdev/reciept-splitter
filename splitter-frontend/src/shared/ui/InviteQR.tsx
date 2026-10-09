// src/shared/ui/InviteQR.tsx
import React from 'react';
import { YStack, Card } from 'tamagui';
import { Paragraph, Text } from '@/shared/ui/typography';
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
        <Paragraph fow="700" fos="$6">
          {title}
        </Paragraph>
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

      <YStack ai="center" gap="$1">
        <Paragraph col="$gray10" size="$2">
          {caption ?? t('friends.qr.validLimited')}
        </Paragraph>
        {!!expiresAt && (
          <Text color="$gray10" fontSize={12}>
            {t('friends.qr.expiresAt', { time: dateTime(expiresAt, i18n.language) })}
          </Text>
        )}
      </YStack>
    </YStack>
  );
}
