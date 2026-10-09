import React from 'react';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import Section from '@/shared/ui/Section';
import type { UserStats } from '@/features/auth/api';
import { AnimatedNumber } from '@/shared/ui/motion';

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <YStack f={1} ai="center" gap="$1" accessible accessibilityLabel={`${label}: ${value ?? '—'}`}>
      <Text fontSize={26} fontWeight="800" color="$primaryText">
        {value === undefined ? '—' : <AnimatedNumber value={value} fromZero format={(v) => v} />}
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
    // the numbers and their labels say it all: no section title
    <Section>
      <XStack>
        <Stat label={t('profile.stats.sessions', 'Bills')} value={stats?.sessions} />
        <Stat label={t('profile.stats.friends', 'Friends')} value={stats?.friends} />
        <Stat label={t('profile.stats.groups', 'Groups')} value={stats?.groups} />
      </XStack>
    </Section>
  );
}
