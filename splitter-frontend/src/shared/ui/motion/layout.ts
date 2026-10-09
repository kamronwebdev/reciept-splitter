import { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { DURATION } from './tokens';

/**
 * Layout transitions for lists whose items are added / removed (friend added, member removed, request
 * approved, item deleted): the removed row fades out and the rows below slide up into its place.
 * ReduceMotion.System: with Reduce Motion on, the change is instant.
 */
export const listLayout = LinearTransition.duration(DURATION.base).reduceMotion(ReduceMotion.System);
export const listEntering = FadeIn.duration(DURATION.base).reduceMotion(ReduceMotion.System);
export const listExiting = FadeOut.duration(DURATION.fast).reduceMotion(ReduceMotion.System);
