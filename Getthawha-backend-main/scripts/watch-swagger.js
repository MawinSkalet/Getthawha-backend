#!/usr/bin/env node

/**
 * Watch script to automatically rebuild swagger.json when YAML files change
 * Usage: npm run swagger:watch
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

console.log("👀 Watching swagger YAML files for changes...");

const swaggerDir = path.join(__dirname, "..", "swagger");
const buildScript = path.join(__dirname, "build-swagger.js");

// Function to run the build script
function buildSwagger() {
  console.log("\n🔄 Changes detected, rebuilding swagger.json...");

  const build = spawn("node", [buildScript], {
    stdio: "inherit",
  });

  build.on("close", (code) => {
    if (code === 0) {
      console.log("✅ Rebuild completed successfully\n");
    } else {
      console.log("❌ Rebuild failed\n");
    }
    console.log("👀 Continuing to watch for changes...");
  });
}

// Initial build
buildSwagger();

// Watch for changes in swagger directory
try {
  fs.watch(swaggerDir, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith(".yaml")) {
      console.log(`📝 File changed: ${filename}`);

      // Debounce: wait a bit to avoid multiple rapid rebuilds
      clearTimeout(buildSwagger.timeout);
      buildSwagger.timeout = setTimeout(buildSwagger, 500);
    }
  });

  console.log(`👀 Watching: ${swaggerDir}`);
  console.log("Press Ctrl+C to stop watching");
} catch (error) {
  console.error("❌ Error setting up file watcher:", error.message);
  console.log("💡 Try running: npm run build:swagger instead");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Stopping swagger watcher...");
  process.exit(0);
});
