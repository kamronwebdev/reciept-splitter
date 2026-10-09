import React from 'react';
import { Spinner, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import BottomSheet from '@/shared/ui/BottomSheet';
import UserAvatar from '@/shared/ui/UserAvatar';
import type { FriendCard, PublicFriend } from '../../api/friends.api';
import type { GroupJoinResult } from '@/features/groups/api/groups.api';
import type { FriendQrErrorCode } from '../../model/qr-errors';
import { handleOf } from '../../lib/format';
import AppIcon from '@/shared/ui/AppIcon';

export type ScanResult =
  | { kind: 'checking' }
  | { kind: 'card'; code: string; card: FriendCard; busy?: boolean }
  | { kind: 'added'; friend: PublicFriend | null }
  | { kind: 'group-joining' }
  | { kind: 'group-done'; result: GroupJoinResult }
  | { kind: 'no-qr' }
  | { kind: 'error'; code: FriendQrErrorCode; retry?: () => void };

type Props = {
  result: ScanResult | null;
  onAdd: (code: string) => void;
  onDone: () => void;
  onScanAnother: () => void;
  onOpenGroups: () => void;
};

/** Everything that happens after a QR was read, as one bottom sheet over the (paused) camera. */
export default function ScanResultSheet({ result, onAdd, onDone, onScanAnother, onOpenGroups }: Props) {
  const { t } = useTranslation();
  const busy = !!result && (result.kind === 'checking' || result.kind === 'group-joining' || (result.kind === 'card' && !!result.busy));
  return (
    <BottomSheet visible={!!result} onClose={busy ? () => undefined : onScanAnother} label={t('friends.qr.scan.title')}>
      <YStack gap="$3" pb="$2" ai="center" w="100%">
        {result && <Body result={result} onAdd={onAdd} onDone={onDone} onScanAnother={onScanAnother} onOpenGroups={onOpenGroups} />}
      </YStack>
    </BottomSheet>
  );
}

function Person({ friend }: { friend: PublicFriend }) {
  return (
    <YStack ai="center" gap="$1.5" w="100%">
      <UserAvatar uri={friend.avatarUrl} label={friend.username} seed={friend.uniqueId} size={88} textSize={32} />
      <Text fontSize={22} fontWeight="800" color="$text" ta="center" numberOfLines={2}>
        {friend.username}
      </Text>
      <Text fontSize={15} color="$textMuted" ta="center">
        {handleOf(friend.uniqueId)}
      </Text>
    </YStack>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return (
    <YStack w="100%" gap="$2.5" pt="$2">
      {children}
    </YStack>
  );
}

function Body({ result, onAdd, onDone, onScanAnother, onOpenGroups }: { result: ScanResult } & Omit<Props, 'result'>) {
  const { t } = useTranslation();
  const scanAnother = <Button title={t('friends.qr.card.scanAnother')} variant="outline" size="large" onPress={onScanAnother} />;
  const done = <Button title={t('friends.qr.card.done')} variant="primary" size="large" onPress={onDone} />;

  switch (result.kind) {
    case 'checking':
    case 'group-joining':
      return (
        <YStack minHeight={180} ai="center" jc="center" gap="$3" accessibilityLiveRegion="polite">
          <Spinner size="large" />
          <Text fontSize={16} color="$textMuted" ta="center">
            {result.kind === 'checking' ? t('friends.qr.scan.checking') : t('friends.qr.group.joining')}
          </Text>
        </YStack>
      );

    case 'card': {
      const { card, code, busy } = result;
      const status = card.friendshipStatus;
      return (
        <>
          <Person friend={card} />
          {status === 'self' && <Hint text={t('friends.qr.card.selfHint')} />}
          {status === 'friends' && <Hint text={t('friends.qr.card.friendsHint')} />}
          {status === 'pending_incoming' && <Hint text={t('friends.qr.card.pendingIncoming', { name: card.username })} />}
          {status === 'pending_outgoing' && <Hint text={t('friends.qr.card.pendingOutgoing')} />}
          <Actions>
            {status === 'self' && (
              <>
                <Badge text={t('friends.qr.card.self')} />
                {scanAnother}
              </>
            )}
            {status === 'friends' && (
              <>
                <Badge text={t('friends.qr.card.alreadyFriends')} ok />
                {done}
                {scanAnother}
              </>
            )}
            {(status === 'none' || status === 'pending_outgoing' || status === 'pending_incoming') && (
              <>
                <Button
                  title={status === 'pending_incoming' ? t('friends.qr.card.accept') : t('friends.qr.card.add')}
                  variant="primary"
                  size="large"
                  loading={!!busy}
                  onPress={() => onAdd(code)}
                />
                {!busy && scanAnother}
              </>
            )}
          </Actions>
        </>
      );
    }

    case 'added':
      return (
        <>
          <AppIcon name="checkCircle" size={40} color="$success" />
          {result.friend && <Person friend={result.friend} />}
          <Text fontSize={20} fontWeight="800" color="$text" ta="center" accessibilityRole="alert">
            {t('friends.qr.card.addedTitle')}
          </Text>
          {result.friend && <Hint text={t('friends.qr.card.addedBody', { name: result.friend.username })} />}
          <Actions>
            {done}
            {scanAnother}
          </Actions>
        </>
      );

    case 'group-done': {
      const { result: r } = result;
      const title =
        r.member === 'owner'
          ? t('friends.qr.group.owner')
          : r.member === 'existing'
            ? t('friends.qr.group.alreadyMember')
            : r.groupName
              ? t('friends.qr.group.joined', { name: r.groupName })
              : t('friends.qr.group.joinedGeneric');
      return (
        <>
          <YStack w={72} h={72} br={36} ai="center" jc="center" backgroundColor="$primarySoft">
            <AppIcon name="friends" size={32} color="$primary" />
          </YStack>
          <Text fontSize={20} fontWeight="800" color="$text" ta="center" accessibilityRole="alert">
            {title}
          </Text>
          {r.member === 'created' && <Hint text={t('friends.qr.group.friendsToo')} />}
          <Actions>
            <Button title={t('friends.qr.group.open')} variant="primary" size="large" onPress={onOpenGroups} />
            {scanAnother}
          </Actions>
        </>
      );
    }

    case 'no-qr':
      return (
        <>
          <ErrorIcon />
          <Text fontSize={17} fontWeight="700" color="$text" ta="center" accessibilityRole="alert">
            {t('friends.qr.scan.noQrInImage')}
          </Text>
          <Actions>
            <Button title={t('friends.qr.errors.scanAgain')} variant="primary" size="large" onPress={onScanAnother} />
          </Actions>
        </>
      );

    case 'error':
      return (
        <>
          <ErrorIcon />
          <Text fontSize={20} fontWeight="800" color="$text" ta="center" accessibilityRole="alert">
            {t(`friends.qr.errors.${result.code}`)}
          </Text>
          <Hint text={t(`friends.qr.errors.${result.code}_body`)} />
          <Actions>
            {result.retry && <Button title={t('friends.qr.errors.tryAgain')} variant="primary" size="large" onPress={result.retry} />}
            <Button title={t('friends.qr.errors.scanAgain')} variant={result.retry ? 'outline' : 'primary'} size="large" onPress={onScanAnother} />
          </Actions>
        </>
      );
  }
}

function Hint({ text }: { text: string }) {
  return (
    <Text fontSize={15} color="$textMuted" ta="center">
      {text}
    </Text>
  );
}

function Badge({ text, ok }: { text: string; ok?: boolean }) {
  return (
    <YStack alignSelf="center" px="$3.5" py="$2" borderRadius={999} backgroundColor={ok ? '$primarySoft' : '$surfaceAlt'}>
      <Text fontSize={15} fontWeight="700" color={ok ? '$primaryText' : '$text'}>
        {text}
      </Text>
    </YStack>
  );
}

function ErrorIcon() {
  return (
    <YStack w={72} h={72} br={36} ai="center" jc="center" backgroundColor="$dangerSoft">
      <AppIcon name="warning" size={32} color="$danger" />
    </YStack>
  );
}
