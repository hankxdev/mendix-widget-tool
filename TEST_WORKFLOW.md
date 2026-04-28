# Test Workflow for Multi-Widget Workspace

This document outlines manual testing steps to verify the multi-widget workspace implementation.

## Prerequisites

```bash
# Build the CLI
cd /Users/hankmendix/work/mendix-widget-tool
npm run build

# Create alias for testing (optional)
alias mx-widget-cli="node /Users/hankmendix/work/mendix-widget-tool/dist/index.js"
```

## Test 1: Standalone Widget (Backward Compatibility)

```bash
# Create a test directory
mkdir -p /tmp/test-standalone
cd /tmp/test-standalone

# Create a standalone widget
mx-widget-cli StandaloneWidget \
  --description "Test standalone widget" \
  --author "Test User" \
  --package mendix \
  --project-path ../../ \
  --no-install

# Verify structure
ls -la StandaloneWidget/
ls -la StandaloneWidget/typings/  # Should have mendix.d.ts and css.d.ts

# Check package.json
cat StandaloneWidget/package.json | grep '"name"'
# Should output: "name": "standalonewidget",

# Check tsconfig.json
cat StandaloneWidget/tsconfig.json
# Should NOT include shared-typings reference
```

## Test 2: Initialize Workspace

```bash
# Create a test directory
mkdir -p /tmp/test-workspace
cd /tmp/test-workspace

# Initialize workspace (interactive mode)
mx-widget-cli init

# Or non-interactive (if prompts are skipped):
# You'll need to manually answer:
# - Mendix project path: ../../
# - Default package namespace: mendix

# Verify structure
ls -la
# Should see: package.json, mx-workspace.json, packages/, widgets/

ls -la packages/shared-typings/
# Should see: package.json, index.d.ts, mendix.d.ts, css.d.ts

# Check workspace package.json
cat package.json | grep -A 5 '"workspaces"'
# Should show: ["widgets/*", "packages/*"]

# Check workspace config
cat mx-workspace.json
# Should show version, mendixProjectPath, defaultPackagePath, widgets: {}
```

## Test 3: Add Widgets to Workspace

```bash
cd /tmp/test-workspace

# Add first widget (interactive)
mx-widget-cli add DataGrid

# Answer prompts:
# - Description: Custom data grid widget
# - Author: Test User
# - Needs entity context: Yes

# Verify widget structure
ls -la widgets/DataGrid/
ls -la widgets/DataGrid/typings/
# Should have DataGridProps.d.ts but NOT mendix.d.ts or css.d.ts

# Check package.json
cat widgets/DataGrid/package.json | grep '"name"'
# Should output: "name": "@widgets/data-grid",

cat widgets/DataGrid/package.json | grep '@mx/typings'
# Should show: "@mx/typings": "0.0.0"

# Check tsconfig.json
cat widgets/DataGrid/tsconfig.json | grep 'shared-typings'
# Should include: "../../packages/shared-typings"

# Check workspace config
cat mx-workspace.json
# Should list DataGrid in widgets object

# Add another widget
mx-widget-cli add Chart --description "Custom chart widget"

# Verify
ls -la widgets/
# Should see: Chart/ and DataGrid/
```

## Test 4: List Widgets

```bash
cd /tmp/test-workspace

mx-widget-cli list

# Expected output:
# Workspace Widgets
# 
# DataGrid v1.0.0
# Custom data grid widget
#
# Chart v1.0.0
# Custom chart widget
```

## Test 5: Build Commands

```bash
cd /tmp/test-workspace

# Install dependencies first
npm install

# Build specific widget
mx-widget-cli build DataGrid
# Should see spinner and success message

# Build multiple widgets
mx-widget-cli build DataGrid Chart
# Should build both sequentially

# Build all widgets
mx-widget-cli build --all
# Should build all widgets

# Production build
mx-widget-cli build --all --production
# Should run release script instead of build
```

## Test 6: Test Commands

```bash
cd /tmp/test-workspace

# Test specific widget
mx-widget-cli test DataGrid

# Test all widgets
mx-widget-cli test --all
```

## Test 7: Lint Commands

```bash
cd /tmp/test-workspace

# Lint specific widget
mx-widget-cli lint DataGrid

# Lint with fix
mx-widget-cli lint DataGrid --fix

# Lint all
mx-widget-cli lint --all
```

## Test 8: Type Generation

```bash
cd /tmp/test-workspace

# Generate types for specific widget
mx-widget-cli typegen DataGrid

# Generate types for all
mx-widget-cli typegen --all
```

## Test 9: Dev Mode

```bash
cd /tmp/test-workspace

# Run dev mode (watch) for a widget
mx-widget-cli dev DataGrid

# This should start Rollup watch mode
# Press Ctrl+C to stop

# Try running dev for multiple widgets (should error)
mx-widget-cli dev DataGrid Chart
# Expected error: "Dev mode only supports one widget at a time"
```

## Test 10: Error Handling

```bash
cd /tmp/test-workspace

# Try to add duplicate widget
mx-widget-cli add DataGrid
# Expected error: Widget "DataGrid" already exists

# Try to build non-existent widget
mx-widget-cli build NonExistent
# Expected error: Unknown widget(s): NonExistent
# Should list available widgets

# Try to run workspace commands outside workspace
cd /tmp
mx-widget-cli list
# Expected error: Not in a workspace

# Try to init in non-empty directory
cd /tmp/test-workspace
mx-widget-cli init
# Expected error: Already a workspace
```

## Test 11: Help Documentation

```bash
# Main help
mx-widget-cli --help

# Version
mx-widget-cli --version
# Should show: 1.2.0

# Command-specific help
mx-widget-cli init --help
mx-widget-cli add --help
mx-widget-cli build --help
mx-widget-cli dev --help
mx-widget-cli test --help
mx-widget-cli lint --help
mx-widget-cli typegen --help
mx-widget-cli list --help
```

## Expected Results Summary

| Test | Expected Result |
|------|----------------|
| Standalone widget | ✅ Creates widget with mendix.d.ts and css.d.ts |
| Init workspace | ✅ Creates workspace structure with shared-typings |
| Add widget | ✅ Creates widget without duplicate typings, references @mx/typings |
| List | ✅ Shows all widgets with versions and descriptions |
| Build | ✅ Builds widgets with progress spinners |
| Test | ✅ Runs tests for specified widgets |
| Lint | ✅ Lints widgets with optional fix flag |
| Typegen | ✅ Regenerates types from widget XML |
| Dev | ✅ Starts watch mode, rejects multiple widgets |
| Error handling | ✅ Clear error messages with helpful context |
| Help | ✅ All commands documented with accurate descriptions |

## Cleanup

```bash
# Remove test directories
rm -rf /tmp/test-standalone
rm -rf /tmp/test-workspace
```

## Notes

- The interactive prompts may not work well with automated testing
- For CI/CD, use non-interactive mode with all flags
- The workspace commands must be run from workspace root
- Dev mode only supports one widget at a time (watch mode limitation)
- All commands validate widget existence and provide helpful errors
