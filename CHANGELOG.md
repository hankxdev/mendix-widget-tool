# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-04-24

### Added

#### Multi-Widget Workspace Support
- **`init` command**: Initialize a multi-widget workspace with npm workspaces architecture
  - Creates `mx-workspace.json` for workspace configuration
  - Sets up `packages/shared-typings` with shared Mendix type definitions
  - Configures npm workspaces with `widgets/*` and `packages/*` patterns
  - Single `npm install` for all widgets in workspace

- **`add` command**: Add widgets to workspace
  - Scaffolds widgets into `widgets/` directory
  - Uses workspace defaults for Mendix project path and package namespace
  - Automatically references shared typings package (`@mx/typings`)
  - Updates workspace configuration with new widget metadata

- **`dev` command**: Run development mode for widgets
  - Executes `npm run dev` for specified widget in watch mode
  - Widget name resolution: PascalCase → `widgets/{WidgetName}` directory

- **`build` command**: Build one or more widgets
  - Build specific widgets or all widgets with `--all` flag
  - `--production` flag for production builds (runs `release` script)
  - Sequential execution with progress spinners

- **`test` command**: Run tests for widgets
  - Test specific widgets or all widgets with `--all` flag
  - Executes Vitest for each widget

- **`lint` command**: Lint widgets
  - Lint specific widgets or all widgets with `--all` flag
  - `--fix` option for auto-fixing lint errors

- **`typegen` command**: Regenerate TypeScript types
  - Generate types for specific widgets or all widgets with `--all` flag
  - Useful after modifying widget XML definitions

- **`list` command**: List all widgets in workspace
  - Shows widget name, version, and description
  - Reads data from widget `package.json` files

#### Workspace Infrastructure
- **Shared typings package** (`@mx/typings`):
  - Eliminates duplicate Mendix Client API types across widgets
  - Includes `mendix.d.ts` (mx.data, mx.ui namespaces)
  - Includes `css.d.ts` (CSS/SCSS module declarations)
  - Referenced as internal workspace dependency (`0.0.0` version)

- **Workspace detection**:
  - Detects workspace mode via `mx-workspace.json` or `package.json` workspaces field
  - `findWorkspaceRoot()` traverses directory tree to locate workspace root
  - Mode-aware scaffolding (skips shared typings in workspace mode)

#### Template Updates
- Modified `tsconfig.json.ejs` to conditionally include shared-typings
- Modified `package.json.ejs` to conditionally add `@mx/typings` dependency
- Scaffold logic skips `typings/mendix.d.ts` and `typings/css.d.ts` in workspace mode

### Changed
- Workspace-scoped widgets use `@widgets/{widget-name}` package naming convention
- Widget-specific types still generated in `typings/{WidgetName}Props.d.ts`
- Rollup and Vite configs remain unchanged (use relative paths, work in workspaces)

### Technical Details
- Zero new dependencies (uses npm workspaces, built into npm)
- Backward compatible: standalone mode works identically
- Per-widget configs unchanged and fully transparent
- npm workspaces enable hoisted dependencies while preserving per-widget autonomy

## [1.1.0] - 2026-04-23

### Added
- Initial multi-widget workspace foundation
- Workspace detection and configuration utilities

## [1.0.1] - 2026-04-23

### Added
- Mendix client API type definitions in generated projects

## [1.0.0] - 2026-04-23

### Added
- Initial release
- Scaffold modern Mendix pluggable widgets
- Vite dev server with HMR
- Rollup production builds
- TypeScript with auto-generated types
- SASS/SCSS support
- Vitest + Testing Library setup
- ESLint + Prettier configuration
- AMD + ESM output formats
