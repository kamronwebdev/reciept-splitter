// Regenerates .expo/types/router.d.ts (typed routes) without starting Metro, e.g. for `tsc` in CI.
// Same code path as `expo customize tsconfig.json`.
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');
process.env.EXPO_ROUTER_APP_ROOT = path.join(projectRoot, 'app');
const cliDir = path.dirname(require.resolve('@expo/cli/package.json', { paths: [require.resolve('expo/package.json')] }));
const typedRoutes = require(require.resolve('@expo/router-server/build/typed-routes', { paths: [cliDir, projectRoot] }));
typedRoutes.regenerateDeclarations(path.join(projectRoot, '.expo/types'), {});
console.log('typed routes regenerated');
