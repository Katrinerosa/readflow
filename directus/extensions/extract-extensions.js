#!/usr/bin/env node

/**
 * Extract Directus extensions from node_modules to extensions directory
 * This script reads package.json dependencies and extracts any package
 * that has a "directus:extension" field in its package.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current directory
const cwd = process.cwd();

// Read package.json
const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
const deps = pkg.dependencies || {};

console.log('Scanning for Directus extensions...');

let extensionCount = 0;

Object.keys(deps).forEach(name => {
    const pkgPath = path.join(cwd, 'node_modules', name);
    const pkgJsonPath = path.join(pkgPath, 'package.json');

    // Check if package exists
    if (!fs.existsSync(pkgJsonPath)) {
        console.log(`Warning: Package ${name} not found in node_modules`);
        return;
    }

    // Read package.json
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    // Check if it's a Directus extension
    if (pkgJson['directus:extension']) {
        extensionCount++;

        // Extract extension name (remove scope for scoped packages)
        // e.g., @directus-labs/calculated-fields-bundle -> calculated-fields-bundle
        const extName = name.replace(/^@[^/]+\//, '');

        console.log(`Found Directus extension: ${name}`);
        console.log(`  Type: ${pkgJson['directus:extension'].type}`);
        console.log(`  Extracting to: ${extName}/`);

        // Create directory and copy extension
        try {
            execSync(`mkdir -p "${extName}"`, { stdio: 'inherit' });
            execSync(`cp -r "${pkgPath}"/* "${extName}/"`, { stdio: 'inherit' });

            // Install runtime dependencies from the extension's package.json
            const extPkgJsonPath = path.join(extName, 'package.json');
            if (fs.existsSync(extPkgJsonPath)) {
                const extPkgJson = JSON.parse(fs.readFileSync(extPkgJsonPath, 'utf8'));

                // Collect all dependencies that need to be installed
                const regularDeps = extPkgJson.dependencies || {};
                const peerDeps = extPkgJson.peerDependencies || {};
                const externalDeps = extPkgJson.externalDependencies || [];

                // Get all dependency names (excluding directus core packages which are provided by Directus)
                const directusCorePackages = ['@directus/extensions-sdk', '@directus/types', '@directus/api', 'directus'];
                const depsToInstall = [
                    ...Object.keys(regularDeps),
                    ...Object.keys(peerDeps),
                    ...externalDeps
                ].filter(dep => !directusCorePackages.includes(dep) && !dep.startsWith('@directus/'));

                // Scan dist files for unlisted dependencies (common packages that extensions forget to list)
                const commonUnlistedDeps = ['uuid', 'lodash-es', 'date-fns'];
                const distPath = path.join(extName, 'dist');
                if (fs.existsSync(distPath)) {
                    const files = fs.readdirSync(distPath);
                    for (const file of files) {
                        if (file.endsWith('.js')) {
                            const content = fs.readFileSync(path.join(distPath, file), 'utf8');
                            for (const dep of commonUnlistedDeps) {
                                if (!depsToInstall.includes(dep)) {
                                    // Check for various import patterns (including minified)
                                    if (content.includes(`from"${dep}"`) || content.includes(`from'${dep}'`) ||
                                        content.includes(`from "${dep}"`) || content.includes(`from '${dep}'`) ||
                                        content.includes(`require('${dep}')`) || content.includes(`require("${dep}")`)) {
                                        depsToInstall.push(dep);
                                    }
                                }
                            }
                        }
                    }
                }

                // Remove duplicates
                const uniqueDeps = [...new Set(depsToInstall)];

                if (uniqueDeps.length > 0) {
                    console.log(`  Installing runtime dependencies: ${uniqueDeps.join(', ')}`);
                    try {
                        execSync(`cd "${extName}" && npm install ${uniqueDeps.join(' ')} --omit=dev`, { stdio: 'pipe' });
                        console.log(`  ✓ Dependencies installed`);
                    } catch (e) {
                        console.log(`  ⚠ Some dependencies may have failed to install`);
                    }
                }
            }

            console.log(`  ✓ Extracted successfully`);
        } catch (error) {
            console.error(`  ✗ Failed to extract: ${error.message}`);
            process.exit(1);
        }
    }
});

console.log(`\nExtension extraction complete. Found ${extensionCount} extension(s).`);
