import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Text } from '@/shared/ui/typography';
import UserAvatar from '@/shared/ui/UserAvatar';
import { handleOf } from '../lib/format';

type Props = {
  value: string;
  name: string;
  uniqueId?: string | null;
  avatarUrl?: string | null;
  size?: number;
};

// Always black on white (also in dark mode): every scanner reads dark modules on a light background.
const INK = '#000000';
const PAPER = '#FFFFFF';
const MUTED = '#5B6472';

/**
 * The personal friend QR as a self-contained white card (QR + avatar in the middle + name + handle).
 * The same view is captured for "Save image", so it must not depend on the app theme.
 */
const PersonalQrCard = forwardRef<View, Props>(function PersonalQrCard({ value, name, uniqueId, avatarUrl, size = 240 }, ref) {
  const avatarSize = Math.round(size * 0.22);
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={{ width: size, height: size }}>
        {/* high error correction leaves room for the avatar in the center */}
        <QRCode value={value} size={size} ecl="H" color={INK} backgroundColor={PAPER} quietZone={0} />
        <View style={[styles.logoWrap, { top: (size - avatarSize) / 2 - 4, left: (size - avatarSize) / 2 - 4, borderRadius: avatarSize }]}>
          <UserAvatar uri={avatarUrl} label={name} seed={uniqueId} size={avatarSize} textSize={Math.round(avatarSize * 0.4)} />
        </View>
      </View>
      <Text fontSize={20} fontWeight="800" color={INK} ta="center" numberOfLines={2} mt={14} style={styles.text}>
        {name}
      </Text>
      {!!uniqueId && (
        <Text fontSize={15} color={MUTED} ta="center" style={styles.text}>
          {handleOf(uniqueId)}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: PAPER,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    alignSelf: 'center',
  },
  logoWrap: { position: 'absolute', backgroundColor: PAPER, padding: 4 },
  text: { maxWidth: 280 },
});

export default PersonalQrCard;
