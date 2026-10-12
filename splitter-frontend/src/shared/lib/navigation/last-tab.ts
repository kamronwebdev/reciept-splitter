/** The tab the user was on before tapping Scan (the scanner returns there when closed). */
let lastTab: '/home' | '/groups' | '/friends' | '/profile' = '/home';

export function rememberTab(path: string) {
  if (path === '/home' || path === '/groups' || path === '/friends' || path === '/profile') lastTab = path;
}

export function getLastTab() {
  return lastTab;
}
