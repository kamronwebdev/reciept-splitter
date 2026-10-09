import { Easing, ReduceMotion } from 'react-native-reanimated';

/**
 * Motion tokens: short and calm. Every animation in the app uses these, so the feel stays consistent.
 * Durations are 150-300ms; springs are critically damped (no bounce that delays the user).
 */
export const DURATION = { fast: 150, base: 220, slow: 300 } as const;

export const EASE_OUT = Easing.out(Easing.cubic);

export const SPRING = {
  /** press-in / press-out of buttons, rows and cards */
  press: { damping: 24, stiffness: 420, mass: 0.6, reduceMotion: ReduceMotion.System },
  /** sheets: fast, no overshoot */
  sheet: { damping: 30, stiffness: 300, mass: 0.9, overshootClamping: true, reduceMotion: ReduceMotion.System },
  /** small "pop" (badge, check mark): one tiny overshoot, settles in ~250ms */
  pop: { damping: 14, stiffness: 420, mass: 0.5, reduceMotion: ReduceMotion.System },
} as const;

/** List entering: fade + 8pt slide up, 30ms apart, only the first 8 items. */
export const STAGGER = { step: 30, max: 8, offset: 8 } as const;
