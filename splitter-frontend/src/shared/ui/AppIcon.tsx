import React from 'react';
import { Platform } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Crop,
  Download,
  Eye,
  EyeOff,
  House,
  Image,
  Inbox,
  Info,
  Lock,
  Mail,
  Minus,
  Moon,
  Pencil,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCw,
  ScanLine,
  Search,
  Settings,
  Share2,
  Smartphone,
  Sun,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  UserSearch,
  Wallet,
  X,
  XCircle,
  Zap,
  ZapOff,
} from '@tamagui/lucide-icons';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import type { Palette } from '@/shared/theme/palette';

type LucideLike = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/**
 * The ONE icon set of the app: SF Symbols on iOS, the matching Lucide outline icon on Android / web.
 * Add a name here instead of importing icons in screens.
 */
const ICONS = {
  home: ['house', House],
  homeFill: ['house.fill', House],
  groups: ['person.3', UsersRound],
  groupsFill: ['person.3.fill', UsersRound],
  friends: ['person.2', Users],
  friendsFill: ['person.2.fill', Users],
  profile: ['person.crop.circle', UserRound],
  profileFill: ['person.crop.circle.fill', UserRound],
  scan: ['viewfinder', ScanLine],
  qr: ['qrcode', QrCode],
  bell: ['bell', Bell],
  settings: ['gearshape', Settings],
  plus: ['plus', Plus],
  minus: ['minus', Minus],
  check: ['checkmark', Check],
  checkCircle: ['checkmark.circle', CheckCircle2],
  circle: ['circle', Circle],
  close: ['xmark', X],
  clear: ['xmark.circle.fill', XCircle],
  chevronRight: ['chevron.right', ChevronRight],
  chevronLeft: ['chevron.left', ChevronLeft],
  chevronDown: ['chevron.down', ChevronDown],
  chevronUp: ['chevron.up', ChevronUp],
  search: ['magnifyingglass', Search],
  receipt: ['doc.text', Receipt],
  wallet: ['creditcard', Wallet],
  userAdd: ['person.badge.plus', UserPlus],
  userSearch: ['person.crop.circle.badge.questionmark', UserSearch],
  inbox: ['tray', Inbox],
  trash: ['trash', Trash2],
  copy: ['doc.on.doc', Copy],
  share: ['square.and.arrow.up', Share2],
  download: ['square.and.arrow.down', Download],
  refresh: ['arrow.clockwise', RefreshCw],
  rotate: ['rotate.right', RotateCw],
  crop: ['crop', Crop],
  photo: ['photo', Image],
  camera: ['camera', Camera],
  cameraOff: ['video.slash', CameraOff],
  flash: ['bolt.fill', Zap],
  flashOff: ['bolt.slash', ZapOff],
  pencil: ['pencil', Pencil],
  mail: ['envelope', Mail],
  lock: ['lock', Lock],
  eye: ['eye', Eye],
  eyeOff: ['eye.slash', EyeOff],
  info: ['info.circle', Info],
  warning: ['exclamationmark.triangle', AlertTriangle],
  error: ['exclamationmark.circle', AlertCircle],
  sun: ['sun.max', Sun],
  moon: ['moon', Moon],
  phone: ['iphone', Smartphone],
} as const satisfies Record<string, readonly [SFSymbol, LucideLike]>;

export type IconName = keyof typeof ICONS;

/** Standard sizes (HIG): rows & inputs, headers & toolbars, empty states. */
export const ICON_SIZE = { row: 18, header: 22, empty: 28 } as const;

type Props = {
  name: IconName;
  size?: number;
  /** a theme token ("$textMuted", "$primaryText", "$danger"…) or a real color; default: secondary gray */
  color?: string;
  weight?: 'light' | 'regular' | 'medium' | 'semibold';
};

const TOKEN_ALIAS: Record<string, keyof Palette> = { color: 'text', borderColor: 'border', shadowColor: 'shadow' };

function resolve(color: string | undefined, colors: Palette): string {
  if (!color) return colors.textMuted;
  if (color.startsWith('$')) {
    const raw = color.slice(1);
    const key = (TOKEN_ALIAS[raw] ?? raw) as keyof Palette;
    return (colors[key] as string | undefined) ?? colors.textMuted;
  }
  return color;
}

/** Monochrome, outline icon: SF Symbols on iOS (regular weight), Lucide elsewhere. Decorative unless labelled by its parent. */
export default function AppIcon({ name, size = ICON_SIZE.row, color, weight = 'regular' }: Props) {
  const { colors } = useAppTheme();
  const tint = resolve(color, colors);
  const [sf, Fallback] = ICONS[name];
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf} size={size} tintColor={tint} weight={weight} type="monochrome" fallback={<Fallback size={size} color={tint} />} />;
  }
  return <Fallback size={size} color={tint} strokeWidth={weight === 'semibold' || weight === 'medium' ? 2.2 : 1.9} />;
}
