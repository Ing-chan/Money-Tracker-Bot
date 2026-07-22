const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Supporto per monorepo pnpm
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// Dai priorità ai file .js/.jsx rispetto ai sorgenti .ts/.tsx in node_modules
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'mjs', 'cjs'];

module.exports = config;
