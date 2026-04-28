# mx-widget-cli

Modern CLI scaffolder for Mendix pluggable widgets with Vite, Rollup, TypeScript, SASS, and Vitest.

## Features

- 🚀 **Modern build pipeline**: Vite for dev preview + Rollup for production
- 📦 **Self-contained projects**: No dependency on `@mendix/pluggable-widgets-tools`
- 🎨 **SASS support**: Built-in SCSS preprocessing
- ✅ **Testing included**: Vitest + Testing Library setup out of the box
- 🔧 **TypeScript**: Full type safety with auto-generated widget prop types
- 🎯 **AMD + ESM outputs**: Produces exact format Mendix expects
- 🏗️ **Multi-widget workspaces**: Manage multiple widgets in a monorepo with shared dependencies

## Usage

### Single Widget Mode (Standalone)

Create a standalone widget project with all dependencies included.

#### Interactive Mode

```bash
npx mx-widget-cli
```

#### Non-Interactive Mode

```bash
npx mx-widget-cli MyWidget \
  --description "My custom widget" \
  --author "Your Name" \
  --package mendix \
  --project-path ../../
```

### Multi-Widget Workspace Mode (Monorepo)

Create and manage multiple widgets in a workspace with shared dependencies and typings.

#### Initialize a Workspace

```bash
# Create a new workspace
npx mx-widget-cli init my-widgets
cd my-widgets

# Install shared dependencies (only once!)
npm install
```

This creates:

```
my-widgets/
├── package.json                 # Workspace root with npm workspaces
├── mx-workspace.json            # Workspace configuration
├── packages/
│   └── shared-typings/          # Shared Mendix type definitions
│       ├── package.json         # @mx/typings package
│       ├── mendix.d.ts          # Mendix Client API types
│       ├── css.d.ts             # CSS module types
│       └── index.d.ts           # Main entry point
└── widgets/                     # Your widgets go here
```

#### Add Widgets to Workspace

```bash
# Add a new widget (interactive)
mx-widget-cli add

# Add a widget (non-interactive)
mx-widget-cli add MyDataGrid --description "Custom data grid"
```

Each widget is scaffolded in `widgets/MyWidgetName/` with the same structure as standalone widgets, but:
- No duplicate `typings/mendix.d.ts` or `typings/css.d.ts` (uses `@mx/typings` instead)
- Widget-specific types still generated in `typings/MyWidgetProps.d.ts`
- Shares dependencies with other widgets (faster installs, smaller disk usage)

#### Workspace Commands

```bash
# List all widgets in workspace
mx-widget-cli list

# Build specific widgets
mx-widget-cli build MyDataGrid MyChart

# Build all widgets
mx-widget-cli build --all

# Run dev mode (watch) for a widget
mx-widget-cli dev MyDataGrid

# Run tests
mx-widget-cli test --all
mx-widget-cli test MyDataGrid

# Lint widgets
mx-widget-cli lint --all
mx-widget-cli lint MyDataGrid --fix

# Regenerate TypeScript types
mx-widget-cli typegen --all
mx-widget-cli typegen MyDataGrid
```

## Generated Project Structure

### Standalone Widget

```
MyWidget/
├── src/
│   ├── MyWidget.tsx                  # Main widget component
│   ├── MyWidget.xml                  # Widget property schema
│   ├── MyWidget.editorConfig.ts      # Studio Pro editor hooks
│   ├── MyWidget.editorPreview.tsx    # Studio Pro preview
│   ├── package.xml                   # Package manifest
│   ├── components/                   # Widget components
│   └── ui/                           # SASS styles
├── typings/                          # Auto-generated TypeScript types
├── __tests__/                        # Vitest tests
├── dev/                              # Vite dev harness
├── scripts/                          # Build utilities
├── rollup.config.mjs                 # Production build config
├── vite.config.ts                    # Dev preview config
└── vitest.config.ts                  # Test config
```

### Workspace Structure

```
my-widgets/                           # Workspace root
├── package.json                      # Workspace config with npm workspaces
├── mx-workspace.json                 # Workspace metadata
├── packages/
│   └── shared-typings/               # Shared types (@mx/typings)
│       ├── package.json
│       ├── index.d.ts
│       ├── mendix.d.ts               # Mendix Client API types
│       └── css.d.ts                  # CSS module types
└── widgets/
    ├── MyDataGrid/                   # Widget 1 (same structure as standalone)
    │   ├── src/
    │   ├── typings/
    │   │   └── MyDataGridProps.d.ts  # Widget-specific types only
    │   ├── package.json              # Includes "@mx/typings": "0.0.0"
    │   ├── rollup.config.mjs         # Unchanged (works in workspace)
    │   └── tsconfig.json             # Includes "../../packages/shared-typings"
    └── MyChart/                      # Widget 2
```

## NPM Scripts

### Standalone Widget

| Command | Description |
|---------|-------------|
| `npm run dev` | Rollup watch mode - builds AMD output and copies to Mendix project |
| `npm run dev:preview` | Vite dev server - standalone widget preview with HMR |
| `npm run build` | Production build - creates MPK file |
| `npm run release` | Production build with linting |
| `npm test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code style and linting |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run typegen` | Regenerate TypeScript types from widget XML |

### Workspace Commands

| Command | Description |
|---------|-------------|
| `mx-widget-cli init [dir]` | Initialize a multi-widget workspace |
| `mx-widget-cli add [widget]` | Add a widget to workspace |
| `mx-widget-cli list` | List all widgets in workspace |
| `mx-widget-cli dev <widget>` | Run dev mode for a widget (watch mode) |
| `mx-widget-cli build [widgets...] [--all]` | Build one, multiple, or all widgets |
| `mx-widget-cli test [widgets...] [--all]` | Run tests for widgets |
| `mx-widget-cli lint [widgets...] [--all] [--fix]` | Lint widgets |
| `mx-widget-cli typegen [widgets...] [--all]` | Regenerate TypeScript types |

## Development Workflow

### Option 1: Integration with Mendix Studio Pro

```bash
npm run dev
```

This starts Rollup in watch mode, which:
- Rebuilds on every file change
- Generates AMD + ESM bundles
- Creates the MPK file
- Copies to your Mendix project (if configured)
- Triggers browser livereload

### Option 2: Standalone Preview (Fast HMR)

```bash
npm run dev:preview
```

This starts Vite dev server, which:
- Renders the widget in isolation
- Provides instant HMR (Hot Module Replacement)
- Great for rapid UI iteration
- No Mendix Studio Pro required

## Build Output

The `npm run build` command produces:

```
dist/
├── 1.0.0/
│   └── mendix.MyWidget.mpk           # Mendix widget package (ZIP)
└── tmp/widgets/
    ├── package.xml                   # Package manifest
    ├── MyWidget.xml                  # Widget definition
    ├── MyWidget.editorConfig.js      # Editor config (CommonJS)
    ├── MyWidget.editorPreview.js     # Editor preview (CommonJS + CSS inject)
    └── mendix/mywidget/
        ├── MyWidget.js               # Main widget (AMD format)
        ├── MyWidget.mjs              # Main widget (ESM format)
        └── MyWidget.css              # Extracted styles
```

## Key Differences from Official Tool

| Feature | Official Tool | mx-widget-cli |
|---------|--------------|---------------------|
| Build system | Rollup (centralized config) | Rollup (per-project config) |
| Dev server | Rollup watch only | Vite HMR + Rollup watch |
| Styles | CSS | SASS/SCSS |
| Testing | Manual setup | Vitest + Testing Library |
| Transpilation | Babel dual-pass | TypeScript plugin only |
| Config visibility | Opaque npm package | Fully transparent |
| Multi-widget support | No | Yes (npm workspaces) |
| Shared typings | Duplicate per widget | Shared package (@mx/typings) |

## Why Use Workspace Mode?

**Benefits:**
- ✅ **Single `npm install`**: One shared `node_modules` for all widgets
- ✅ **Shared type definitions**: No duplicate Mendix API types across widgets
- ✅ **Centralized commands**: Build, test, and lint all widgets at once
- ✅ **Smaller disk footprint**: Shared dependencies reduce storage usage
- ✅ **Faster CI/CD**: Install dependencies once, build all widgets
- ✅ **Zero new dependencies**: Uses npm workspaces (built into npm)

**When to use standalone mode:**
- Single widget projects
- Publishing standalone widgets to npm/GitHub
- Simple prototypes

**When to use workspace mode:**
- Multiple related widgets for the same project
- Organization widget library
- Shared component patterns across widgets

## License

Apache-2.0
