import React, { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import { CAMERA } from '@/shared/theme/palette';

export type CropRect = { x: number; y: number; width: number; height: number };

type Props = {
  /** size of the displayed image (the overlay covers exactly this area) */
  width: number;
  height: number;
  rect: CropRect;
  onChange: (rect: CropRect) => void;
};

const MIN = 80;
const HANDLE = 44;

/** Simple crop frame: drag the four corners. Everything outside the frame is dimmed. */
export default function CropOverlay({ width, height, rect, onChange }: Props) {
  const startRef = useRef<CropRect>(rect);
  const rectRef = useRef(rect);
  rectRef.current = rect;

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const makeResponder = (corner: 'tl' | 'tr' | 'bl' | 'br') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRef.current = rectRef.current;
      },
      onPanResponderMove: (_e, g) => {
        const s = startRef.current;
        let left = s.x;
        let top = s.y;
        let right = s.x + s.width;
        let bottom = s.y + s.height;
        if (corner === 'tl' || corner === 'bl') left = clamp(s.x + g.dx, 0, right - MIN);
        if (corner === 'tr' || corner === 'br') right = clamp(s.x + s.width + g.dx, left + MIN, width);
        if (corner === 'tl' || corner === 'tr') top = clamp(s.y + g.dy, 0, bottom - MIN);
        if (corner === 'bl' || corner === 'br') bottom = clamp(s.y + s.height + g.dy, top + MIN, height);
        onChange({ x: left, y: top, width: right - left, height: bottom - top });
      },
    });

  const responders = useMemo(
    () => ({ tl: makeResponder('tl'), tr: makeResponder('tr'), bl: makeResponder('bl'), br: makeResponder('br') }),
    // handlers read the latest values through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height]
  );

  const dim = { position: 'absolute', backgroundColor: CAMERA.pillSoft } as const;
  const corner = (key: 'tl' | 'tr' | 'bl' | 'br', left: number, top: number) => (
    <View
      key={key}
      {...responders[key].panHandlers}
      accessible
      accessibilityLabel={`crop ${key}`}
      style={{ position: 'absolute', left: left - HANDLE / 2, top: top - HANDLE / 2, width: HANDLE, height: HANDLE, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: CAMERA.onCamera, borderWidth: 3, borderColor: CAMERA.black }} />
    </View>
  );

  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width, height }} pointerEvents="box-none">
      <View style={[dim, { left: 0, top: 0, width, height: rect.y }]} pointerEvents="none" />
      <View style={[dim, { left: 0, top: rect.y + rect.height, width, height: height - rect.y - rect.height }]} pointerEvents="none" />
      <View style={[dim, { left: 0, top: rect.y, width: rect.x, height: rect.height }]} pointerEvents="none" />
      <View style={[dim, { left: rect.x + rect.width, top: rect.y, width: width - rect.x - rect.width, height: rect.height }]} pointerEvents="none" />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, borderWidth: 2, borderColor: CAMERA.onCamera }}
      />
      {corner('tl', rect.x, rect.y)}
      {corner('tr', rect.x + rect.width, rect.y)}
      {corner('bl', rect.x, rect.y + rect.height)}
      {corner('br', rect.x + rect.width, rect.y + rect.height)}
    </View>
  );
}
