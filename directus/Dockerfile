# Pin to the version the production data was exported with.
# Upgrading is generally fine (Directus runs migrations on boot), but
# downgrading can fail. Bump this in step with your production environment.
FROM directus/directus:11.17.4

# Install wget for health checks
USER root
RUN apk add --no-cache wget
USER node

# Copy extension management files
WORKDIR /directus
COPY extensions/package.json /directus/extensions/package.json
COPY extensions/extract-extensions.js /directus/extensions/extract-extensions.js

# Install extension deps and extract all bundles to extensions directory
RUN cd /directus/extensions && \
    npm install --omit=dev && \
    # Clean up any previously extracted extensions (except node_modules, package.json, etc.) \
    find . -mindepth 1 -maxdepth 1 -type d ! -name 'node_modules' -exec rm -rf {} + && \
    # Extract all Directus extensions from package.json dependencies \
    node extract-extensions.js

# Copy and build local extensions from extensions/local/
COPY --chown=node:node extensions/local/ /tmp/local-extensions/
RUN for dir in /tmp/local-extensions/*/; do \
      if [ -d "$dir/src" ] && [ -f "$dir/package.json" ]; then \
        name=$(basename "$dir"); \
        echo "Building local extension: $name"; \
        cp -r "$dir" "/directus/extensions/$name" && \
        cd "/directus/extensions/$name" && \
        npm install --include=dev && \
        (npm run build 2>/dev/null || npx directus-extension build) && \
        rm -rf node_modules; \
      fi; \
    done && rm -rf /tmp/local-extensions

# Copy schema snapshots
COPY --chown=node:node snapshots /directus/snapshots

EXPOSE 8055

# Default CMD from base image runs Directus
