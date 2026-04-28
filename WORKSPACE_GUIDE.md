# Multi-Widget Workspace Guide

## Quick Start

### Create a New Workspace

```bash
mkdir my-mendix-widgets
cd my-mendix-widgets
mx-widget-cli init
npm install
```

### Add Your First Widget

```bash
mx-widget-cli add MyDataGrid
```

### Add More Widgets

```bash
mx-widget-cli add MyChart
mx-widget-cli add MyButton
```

## Commands

### `mx-widget-cli init [directory]`

Initializes a new multi-widget workspace.

**Prompts:**
- Mendix project path (relative, default: "../../")
- Default package namespace (default: "mendix")

**Creates:**
- `package.json` - Root workspace configuration
- `mx-workspace.json` - Workspace metadata
- `packages/shared-typings/` - Shared TypeScript definitions
- `widgets/` - Empty directory for widgets
- `.gitignore` - Git ignore rules

**Example:**
```bash
mx-widget-cli init
# or
mx-widget-cli init ./my-widgets
```

### `mx-widget-cli add [widget-name]`

Adds a new widget to the workspace.

**Prompts:**
- Widget name (PascalCase)
- Description
- Author
- Needs entity context?

**Creates:**
- `widgets/{WidgetName}/` with full widget structure
- Updates `mx-workspace.json` registry
- Widget package name: `@widgets/{widget-name-kebab}`
- Includes `@mx/typings` dependency
- References shared-typings in tsconfig

**Example:**
```bash
mx-widget-cli add MyDataGrid
# or with positional argument
mx-widget-cli add MyChart
```

**Options:**
- `-d, --description <desc>` - Widget description
- `-a, --author <author>` - Author name

### `mx-widget-cli [widget-name]` (Standalone Mode)

Creates a standalone widget (backward compatible).

**Same as before:** Creates a complete widget project in the current directory with all dependencies and typings included.

**Example:**
```bash
mkdir my-widget
cd my-widget
mx-widget-cli MyWidget
```

## Workspace Structure

```
my-mendix-widgets/
├── package.json                # Root workspace package
├── mx-workspace.json           # Workspace configuration
├── node_modules/               # Shared dependencies (after npm install)
├── packages/
│   └── shared-typings/
│       ├── package.json        # @mx/typings package
│       ├── index.d.ts          # Re-exports
│       ├── mendix.d.ts         # Mendix client API types
│       └── css.d.ts            # CSS module types
└── widgets/
    ├── MyDataGrid/
    │   ├── src/
    │   ├── typings/            # Only MyDataGridProps.d.ts
    │   ├── package.json        # @widgets/my-data-grid
    │   ├── tsconfig.json       # Includes shared-typings
    │   └── [configs...]
    └── MyChart/
        ├── src/
        ├── typings/            # Only MyChartProps.d.ts
        ├── package.json        # @widgets/my-chart
        └── [configs...]
```

## Workspace Configuration

### `mx-workspace.json`

```json
{
    "version": 1,
    "mendixProjectPath": "../../",
    "defaultPackagePath": "mendix",
    "widgets": {
        "MyDataGrid": {
            "added": "2026-04-23T12:46:52.844Z"
        },
        "MyChart": {
            "added": "2026-04-23T12:47:15.415Z"
        }
    }
}
```

### Root `package.json`

```json
{
    "name": "mendix-widgets",
    "private": true,
    "workspaces": [
        "widgets/*",
        "packages/*"
    ],
    "scripts": {
        "dev": "mx-widget-cli dev",
        "build": "mx-widget-cli build --all",
        "test": "mx-widget-cli test --all"
    },
    "devDependencies": {
        "mx-widget-cli": "^1.1.0"
    }
}
```

## Working with Widgets

### Build a Specific Widget

```bash
cd widgets/MyDataGrid
npm run dev              # Watch mode with Mendix integration
npm run dev:preview      # Vite preview with HMR
npm run build            # Production build
npm test                 # Run tests
```

### Build All Widgets (Manual)

```bash
# From workspace root
cd widgets/MyDataGrid && npm run build && cd ../..
cd widgets/MyChart && npm run build && cd ../..
```

### Install Dependencies

**First time:**
```bash
# From workspace root
npm install
```

This installs all dependencies for all widgets in one go!

**After adding a new widget:**
```bash
# From workspace root
npm install
```

## Key Differences from Standalone

| Feature | Workspace Mode | Standalone Mode |
|---------|---------------|-----------------|
| Package name | `@widgets/my-widget` | `my-widget` |
| Dependencies | Shared at root | Per widget |
| Typings location | `packages/shared-typings/` | `typings/` |
| mendix.d.ts | Shared | Per widget |
| npm install | Once at root | Per widget |
| Scaffolding command | `mx-widget-cli add` | `mx-widget-cli WidgetName` |

## Benefits

1. **Single npm install** - All dependencies installed once
2. **Shared types** - Consistent Mendix API types
3. **Faster setup** - No repeated downloads per widget
4. **Easy updates** - Update shared types in one place
5. **Better organization** - All widgets in one place

## Migration from Standalone

To migrate existing standalone widgets to a workspace:

1. Initialize a workspace
2. Copy widget directory to `widgets/`
3. Update `package.json`:
   - Change name to `@widgets/{name}`
   - Add `"@mx/typings": "0.0.0"` to dependencies
4. Update `tsconfig.json`:
   - Add `"../../packages/shared-typings"` to includes
5. Delete `typings/mendix.d.ts` and `typings/css.d.ts`
6. Update `mx-workspace.json` widgets registry
7. Run `npm install` from workspace root

## Troubleshooting

### "Not in a workspace" error
Make sure you're in a directory with `mx-workspace.json` or run `mx-widget-cli init` first.

### TypeScript can't find types
1. Check that `tsconfig.json` includes `"../../packages/shared-typings"`
2. Verify `@mx/typings` is in `package.json` dependencies
3. Run `npm install` from workspace root

### Widget already exists
You can't add a widget with the same name twice. Choose a different name or remove the existing widget first.

## Best Practices

1. **Run npm install from workspace root** - This ensures all dependencies are hoisted correctly
2. **Keep widget names unique** - Widget names must be unique within the workspace
3. **Use PascalCase for names** - Widget names should be PascalCase (e.g., MyDataGrid)
4. **Commit mx-workspace.json** - This tracks all widgets in the workspace
5. **Share common utilities** - Consider creating a `packages/shared-utils/` package for shared code

## Future Features

Coming in future phases:
- Global build/dev/test commands
- Shared component library
- Widget dependencies between workspace widgets
- Migration tool for standalone widgets
- Shared build configuration

---

**Version:** 1.1.0  
**Updated:** 2026-04-23
