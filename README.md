# mx-widget-cli

Modern CLI scaffolder for Mendix pluggable widgets with Vite, Rollup, TypeScript, SASS, and Vitest.

## Features

- 🚀 **Modern build pipeline**: Vite for dev preview + Rollup for production
- 📦 **Self-contained projects**: No dependency on `@mendix/pluggable-widgets-tools`
- 🎨 **SASS support**: Built-in SCSS preprocessing
- ✅ **Testing included**: Vitest + Testing Library setup out of the box
- 🔧 **TypeScript**: Full type safety with auto-generated widget prop types
- 🎯 **AMD + ESM outputs**: Produces exact format Mendix expects

## Usage

### Interactive Mode

```bash
npx mx-widget-cli
```

### Non-Interactive Mode

```bash
npx mx-widget-cli MyWidget \
  --description "My custom widget" \
  --author "Your Name" \
  --package mendix \
  --project-path ../../
```

## Generated Project Structure

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

## NPM Scripts

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

## License

Apache-2.0
