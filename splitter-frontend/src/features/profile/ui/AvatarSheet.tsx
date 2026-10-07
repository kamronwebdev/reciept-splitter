import React from 'react';
import { Linking, Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import BottomSheet from '@/shared/ui/BottomSheet';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import AppIcon from '@/shared/ui/AppIcon';

export type BlockedState = { source: 'camera' | 'library'; canAskAgain: boolean } | null;

type Props = {
  visible: boolean;
  onClose: () => void;
  hasPhoto: boolean;
  blocked: BlockedState;
  onTakePhoto: () => void;
  onChooseLibrary: () => void;
  onRemove: () => void;
};

function Row({ icon, label, onPress, danger }: { icon: React.ReactNode; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 52, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
    >
      <XStack ai="center" gap="$3">
        {icon}
        <Text fontSize={16} fontWeight="600" color={danger ? '$danger' : '$text'}>
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}

/** Bottom sheet: Take photo / Choose from library / Remove photo / Cancel (+ "open Settings" when a permission is blocked). */
export default function AvatarSheet({ visible, onClose, hasPhoto, blocked, onTakePhoto, onChooseLibrary, onRemove }: Props) {
  const { t } = useTranslation();

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      // not available (web): the message already explains what to do
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} label={t('profile.avatar.sheetTitle', 'Profile photo')}>
      <YStack gap="$1">
        <Text fontSize={18} fontWeight="700" ta="center" pb="$2" accessibilityRole="header">
          {t('profile.avatar.sheetTitle', 'Profile photo')}
        </Text>

        {blocked ? (
          <YStack gap="$3" py="$2">
            <Text fontSize={16} fontWeight="700" color="$text">
              {blocked.source === 'camera'
                ? t('profile.avatar.cameraBlockedTitle', 'Camera access is off')
                : t('profile.avatar.photosBlockedTitle', 'Photo access is off')}
            </Text>
            <Text fontSize={14} color="$textMuted">
              {t('profile.avatar.blockedBody', "Allow access in your phone's Settings, then try again.")}
            </Text>
            {!blocked.canAskAgain && (
              <Button title={t('profile.avatar.openSettings', 'Open Settings')} variant="primary" size="large" onPress={openSettings} />
            )}
          </YStack>
        ) : (
          <>
            <Row icon={<AppIcon name="camera" size={22} color="$text" />} label={t('profile.avatar.takePhoto', 'Take photo')} onPress={onTakePhoto} />
            <Row icon={<AppIcon name="photo" size={22} color="$text" />} label={t('profile.avatar.chooseLibrary', 'Choose from library')} onPress={onChooseLibrary} />
            {hasPhoto && (
              <Row icon={<AppIcon name="trash" size={22} color="$danger" />} label={t('profile.avatar.remove', 'Remove photo')} onPress={onRemove} danger />
            )}
          </>
        )}

        <Row icon={<AppIcon name="close" size={22} color="$textMuted" />} label={t('profile.avatar.cancel', 'Cancel')} onPress={onClose} />
      </YStack>
    </BottomSheet>
  );
}
