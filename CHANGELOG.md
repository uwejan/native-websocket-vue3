# Changelog

All notable changes to this project will be documented in this file.

## [4.0.0] - 2024-12-16

### Added
- **`useWebSocket` composable** for Composition API usage
- **TypeScript definitions** in `types/index.d.ts`
- **ESM build** (`dist/build.esm.js`) alongside CJS
- **Unit tests** with Vitest (32 tests)
- **GitHub Actions CI** for automated testing
- **Pinia 3.x support** (peer dep: `^2.1.0 || ^3.0.0`)

### Changed
- Updated minimum Vue version to **3.3.0**
- Updated all dependencies to latest versions
- Migrated to **ESLint 9** flat config
- Migrated to **ES Modules** (`"type": "module"`)
- Improved Pinia detection using `$patch` method instead of internal `_p`

### Fixed
- **`beforeDestroy`** renamed to **`beforeUnmount`** (Vue 3 compatibility)

### Breaking Changes
- Minimum Vue version: **3.3.0** (was 3.0.0)
- Minimum Node.js version: **18** (for ESM support)
- Pinia 1.x is no longer supported

## [3.0.15] - Previous Release
- Initial Pinia support
- Vue 3 compatibility
