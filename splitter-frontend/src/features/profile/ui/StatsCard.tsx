import React from 'react';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import Section from '@/shared/ui/Section';
import type { UserStats } from '@/features/auth/api';

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <YStack f={1} ai="center" gap="$1" accessible accessibilityLabel={`${label}: ${value ?? '—'}`}>
      <Text fontSize={26} fontWeight="800" color="$primaryText">
        {value ?? '—'}
      </Text>
      <Text fontSize={12} color="$textMuted" numberOfLines={1}>
        {label}
      </Text>
    </YStack>
  );
}

export default function StatsCard({ stats }: { stats: UserStats | undefined }) {
  const { t } = useTranslation();
  return (
    <Section title={t('profile.stats.title', 'Your activity')}>
      <XStack>
        <Stat label={t('profile.stats.sessions', 'Bills')} value={stats?.sessions} />
        <Stat label={t('profile.stats.friends', 'Friends')} value={stats?.friends} />
        <Stat label={t('profile.stats.groups', 'Groups')} value={stats?.groups} />
      </XStack>
    </Section>
  );
}
