# Directus Extensions

This directory manages Directus extensions for the project. Extensions are automatically installed and extracted during Docker build.

## How It Works

The build process:

1. **Reads `package.json`** - Lists all extension dependencies
2. **Installs packages** - `npm install` into `node_modules/`
3. **Scans for extensions** - `extract-extensions.js` checks each package for `directus:extension` field
4. **Extracts extensions** - Copies extension files to `/directus/extensions/<extension-name>/`
5. **Directus loads them** - On startup, Directus automatically detects and loads extensions

## Adding Extensions

Simply add the extension package to `dependencies` in `package.json`:

```json
{
  "dependencies": {
    "@directus-labs/calculated-fields-bundle": "^1.0.3",
    "@directus-labs/another-extension": "^2.0.0",
    "@your-org/custom-extension": "^1.0.0"
  }
}
```

Then rebuild:

```bash
# Local development
docker compose build directus
docker compose up -d directus

# Production (Coolify)
git add directus/extensions/package.json
git commit -m "Add new Directus extension"
git push origin main
# Coolify will automatically rebuild and deploy
```

## Removing Extensions

Remove the package from `package.json` and rebuild. The extension will be automatically cleaned up.

## Supported Extension Types

The automatic extraction works for **all Directus extension types**:

- **Interfaces** - Custom field interfaces
- **Displays** - Custom field displays
- **Layouts** - Custom layout views
- **Modules** - Custom modules
- **Panels** - Custom dashboard panels
- **Hooks** - Server-side hooks
- **Endpoints** - Custom API endpoints
- **Operations** - Custom flow operations
- **Bundles** - Collections of multiple extensions

## Extension Discovery

The `extract-extensions.js` script automatically detects Directus extensions by:

1. Reading all packages in `package.json` dependencies
2. Checking if `package.json` has a `directus:extension` field
3. Extracting only valid Directus extensions (ignores regular npm packages)

This means you can safely mix Directus extensions with other npm packages in the same `package.json`.

## Finding Extensions

- **Official Directus Labs**: https://github.com/directus-labs
- **Directus Marketplace**: https://directus.market/
- **NPM Search**: Search for `directus-extension`

## Creating Custom Extensions

To develop your own extensions:

1. Use Directus Extension SDK: `npm create directus-extension@latest`
2. Build your extension
3. Publish to npm or use as local file/git dependency
4. Add to `package.json` dependencies

## Files

- **`package.json`** - Lists all extension dependencies
- **`extract-extensions.js`** - Build script that extracts extensions from node_modules
- **`node_modules/`** - Installed npm packages (in Docker only, not committed)
- **`<extension-name>/`** - Extracted extension directories (created during build)

## Troubleshooting

### Extension not showing up

1. Check build logs: `docker compose logs directus | grep extension`
2. Verify the package has `directus:extension` field in its package.json
3. Ensure the package was installed: `docker exec <container> ls /directus/extensions/node_modules`
4. Check Directus loaded it: Look for "Loaded extensions: ..." in logs

### Build fails

1. Check the package name is correct in `package.json`
2. Verify the package version exists on npm
3. Check Docker build logs for npm install errors

### Extension not compatible

Some extensions may require specific Directus versions. Check the extension's documentation for compatibility.

## Example Extensions

```json
{
  "dependencies": {
    // Field interfaces
    "@directus-labs/calculated-fields-bundle": "^1.0.3",

    // Display options
    "@directus-community/duration-display": "^1.0.0",

    // Custom modules
    "@directus-labs/schema-management-module": "^1.0.0",

    // API endpoints
    "@your-org/custom-api-endpoint": "^1.0.0"
  }
}
```

---

**Last Updated**: 2025-11-10
