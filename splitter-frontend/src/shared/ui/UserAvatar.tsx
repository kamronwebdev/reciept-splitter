import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View as RNView } from 'react-native';
import { View } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { resolveApiUrl } from '@/shared/api/api-url';
import { avatarColors, initialsOf, rebaseAvatarUrl } from '@/shared/lib/utils/avatar';
import { CAMERA } from '@/shared/theme/palette';
import { useAppTheme } from '@/shared/theme/useAppTheme';

interface UserAvatarProps {
  uri?: string | null;
  /** the user's name (initials are derived from it) or a ready-made 1-2 letter label */
  label: string;
  /** stable id (uniqueId) used to pick the default background color; falls back to the label */
  seed?: string | null;
  size?: number;
  textSize?: number;
  /** legacy override of the default background */
  backgroundColor?: string;
  /** dims the avatar and shows a spinner (e.g. while uploading) */
  busy?: boolean;
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});

/**
 * Avatar with a robust fallback: initials on a color derived from the user's id.
 * Relative / legacy-localhost avatar URLs are resolved against the API base; a broken image
 * silently falls back to the initials.
 */
export function UserAvatar({ uri, label, seed, size = 48, textSize, backgroundColor, busy }: UserAvatarProps) {
  const { scheme, colors } = useAppTheme();
  const resolved = rebaseAvatarUrl(uri, resolveApiUrl());
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [resolved]);

  const palette = avatarColors(seed ?? label, scheme);
  const showImage = !!resolved && !failed;
  const initials = initialsOf(label);

  return (
    <View
      w={size}
      h={size}
      br={size / 2}
      overflow="hidden"
      ai="center"
      jc="center"
      backgroundColor={showImage ? '$surfaceAlt' : ((backgroundColor as any) ?? palette.bg)}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {showImage ? (
        <Image
          source={{ uri: resolved! }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text fontSize={textSize ?? Math.round(size / (initials.length > 1 ? 2.8 : 2.4))} fontWeight="700" color={palette.fg as any}>
          {initials}
        </Text>
      )}
      {busy && (
        <RNView style={[styles.busy, { backgroundColor: colors.overlay }]}>
          <ActivityIndicator color={CAMERA.onCamera} />
        </RNView>
      )}
    </View>
  );
}

export default UserAvatar;
