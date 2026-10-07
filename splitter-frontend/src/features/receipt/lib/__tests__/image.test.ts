jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));
import { fitLongSide } from '../image';

describe('fitLongSide', () => {
  it('limits the long side to 2000px and keeps the aspect ratio', () => {
    expect(fitLongSide(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(fitLongSide(3024, 4032)).toEqual({ width: 1500, height: 2000 });
  });
  it('never upscales', () => {
    expect(fitLongSide(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
});
