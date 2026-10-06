import React, { useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Input, ScrollView, Spinner, Separator } from 'tamagui';
import { Paragraph, Text } from '@/shared/ui/typography';
import { useRouter } from 'expo-router';
import { ChevronRight, QrCode, ScanLine, Search, UserPlus } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { FriendListItem } from '@/features/friends/ui/FriendListItem';
import Fab from '@/shared/ui/Fab';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';

export default function FriendsScreen() {
  const { friends, loading, error, fetchAll, requestsRaw } = useFriendsStore();
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const incoming = requestsRaw?.incoming?.length ?? 0;

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery) {
      return friends;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return friends.filter(friend => {
      const title = (
        friend?.user?.displayName || friend?.user?.username || ''
      ).toLowerCase();
      const uniqueId = (friend?.user?.uniqueId || friend?.uniqueId || '').toLowerCase();
      return title.includes(lowerCaseQuery) || uniqueId.includes(lowerCaseQuery);
    });
  }, [friends, searchQuery]);

  if (loading && friends.length === 0) {
    return (
      <ScreenContainer>
        <Spinner size="large" color="$gray10" />
      </ScreenContainer>
    );
  }

  return (
    <YStack f={1} bg="$background">
      <ScrollView f={1} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}>
        {/* the two ways to add someone in person */}
        <XStack gap="$3">
          <BigAction
            icon={<ScanLine size={28} color="$onPrimary" />}
            label={t('friends.qr.scanQr')}
            primary
            onPress={() => router.push({ pathname: '/tabs/scan-invite', params: { from: 'friends' } } as never)}
          />
          <BigAction icon={<QrCode size={28} color="$text" />} label={t('friends.qr.myQr')} onPress={() => router.push('/tabs/friends/invite' as never)} />
        </XStack>

        <XStack gap="$2">
          <LinkRow
            icon={<UserPlus size={20} color="$text" />}
            label={t('friends.qr.requestsLink')}
            badge={incoming > 0 ? t('friends.qr.requestsCount', { count: incoming }) : undefined}
            onPress={() => router.push('/tabs/friends/requests' as never)}
          />
        </XStack>

        {friends.length > 0 && (
          <XStack position="relative" ai="center">
            <Input
              placeholder={t('friends.filter')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              f={1}
              h={44}
              pl={40}
              borderRadius={10}
              bg="$backgroundPress"
              borderWidth={0}
              accessibilityLabel={t('friends.filter')}
            />
            <Search size={20} color="$gray10" position="absolute" left={12} pointerEvents="none" />
          </XStack>
        )}

        {error && <Paragraph col="$red10">{error}</Paragraph>}

        {filteredFriends.length > 0 && (
          <YStack borderWidth={1} borderColor="$gray5" borderRadius={12} overflow="hidden">
            {filteredFriends.map((f, index) => (
              <React.Fragment key={f.user?.id ?? f.userId ?? f.id ?? f.user?.uniqueId ?? f.uniqueId ?? index}>
                <FriendListItem friend={f} />
                {index < filteredFriends.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </YStack>
        )}

        {filteredFriends.length === 0 && !loading && (
          <Text fontSize={15} ta="center" color="$textMuted" mt="$2">
            {searchQuery ? t('friends.noMatches') : t('friends.empty')}
          </Text>
        )}
      </ScrollView>

      <Fab onPress={() => router.push('/tabs/friends/search')} />
    </YStack>
  );
}

function BigAction({ icon, label, onPress, primary }: { icon: React.ReactNode; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1 }}>
      {({ pressed }) => (
        <YStack
          minHeight={96}
          borderRadius={18}
          ai="center"
          jc="center"
          gap="$2"
          p="$3"
          backgroundColor={primary ? '$primary' : '$surfaceAlt'}
          opacity={pressed ? 0.8 : 1}
        >
          {icon}
          <Text fontSize={16} fontWeight="800" color={primary ? '$onPrimary' : '$text'} ta="center" numberOfLines={2}>
            {label}
          </Text>
        </YStack>
      )}
    </Pressable>
  );
}

function LinkRow({ icon, label, badge, onPress }: { icon: React.ReactNode; label: string; badge?: string | undefined; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge}` : label} style={{ flex: 1 }}>
      {({ pressed }) => (
        <XStack minHeight={52} ai="center" gap="$3" px="$3.5" borderRadius={14} backgroundColor="$surface" borderWidth={1} borderColor="$borderColor" opacity={pressed ? 0.8 : 1}>
          {icon}
          <Text fontSize={16} fontWeight="600" color="$text" f={1} ta="left">
            {label}
          </Text>
          {!!badge && (
            <YStack px="$2.5" py="$1" borderRadius={999} backgroundColor="$primary">
              <Text fontSize={12} fontWeight="800" color="$onPrimary">
                {badge}
              </Text>
            </YStack>
          )}
          <ChevronRight size={18} color="$textMuted" />
        </XStack>
      )}
    </Pressable>
  );
}
