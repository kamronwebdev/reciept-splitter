jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
import { pickApiUrl } from '../api-url';

const base = { isDev: true, isWeb: false };

describe('pickApiUrl', () => {
  it('follows the current Metro host in dev', () => {
    expect(pickApiUrl({ ...base, hostUri: '192.168.1.7:8081' })).toBe('http://192.168.1.7:3001');
  });
  it('ignores a stale LAN IP from .env in dev', () => {
    expect(pickApiUrl({ ...base, explicit: 'http://10.20.2.51:3001', hostUri: '10.20.3.9:8081' })).toBe(
      'http://10.20.3.9:3001'
    );
  });
  it('honors an explicit public URL', () => {
    expect(pickApiUrl({ ...base, explicit: 'https://api.example.com/', hostUri: '10.0.0.2:8081' })).toBe(
      'https://api.example.com'
    );
  });
  it('uses hosted backend in tunnel mode and release builds', () => {
    expect(pickApiUrl({ ...base, hostUri: 'abc.exp.direct:80' })).toMatch(/onrender\.com$/);
    expect(pickApiUrl({ isDev: false, isWeb: false, hostUri: '10.0.0.2:8081' })).toMatch(/onrender\.com$/);
  });
  it('keeps an explicit LAN URL when there is no Metro host', () => {
    expect(pickApiUrl({ ...base, explicit: 'http://10.0.0.5:3001' })).toBe('http://10.0.0.5:3001');
  });
});
