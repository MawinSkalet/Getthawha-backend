#!/usr/bin/env node

/**
 * Simple script to merge modular swagger YAML files into a single JSON file
 * Usage: node merge-swagger.js
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// Simple YAML to JSON converter (you might want to use js-yaml package for production)
function parseYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return yaml.load(content);
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e.message);
    return null;
  }
}

// Main function to merge swagger files
function mergeSwagger() {
  const swaggerDir = __dirname;
  const mainFile = path.join(swaggerDir, "swagger.yaml");

  // Parse main swagger file
  const mainSwagger = parseYamlFile(mainFile);
  if (!mainSwagger) {
    console.error("Failed to parse main swagger.yaml file");
    process.exit(1);
  }

  // Initialize the merged swagger
  const mergedSwagger = {
    openapi: mainSwagger.openapi,
    info: mainSwagger.info,
    paths: {},
    components: {
      schemas: {},
    },
  };

  // Read and merge all path files
  const pathFiles = [
    "auth.yaml",
    "booking.yaml",
    "admin-booking.yaml",
    "admin-branch.yaml",
    "admin-package.yaml",
    "admin-voucher.yaml",
    "admin-staff.yaml",
    "admin-dashboard.yaml",
    "admin-calendar.yaml",
    "admin-users.yaml",
    // User-facing endpoints
    "user-info.yaml",
    "user-branch.yaml",
    "user-package.yaml",
    "user-voucher.yaml",
  ];

  pathFiles.forEach((file) => {
    const filePath = path.join(swaggerDir, "paths", file);
    if (fs.existsSync(filePath)) {
      const pathData = parseYamlFile(filePath);
      if (pathData) {
        Object.assign(mergedSwagger.paths, pathData);
      }
    }
  });

  // Read and merge schemas
  const schemasPath = path.join(swaggerDir, "components", "schemas.yaml");
  if (fs.existsSync(schemasPath)) {
    const schemas = parseYamlFile(schemasPath);
    if (schemas) {
      mergedSwagger.components.schemas = schemas;
    }
  }

  // Write merged swagger to JSON file
  const outputFile = path.join(swaggerDir, "..", "swagger-merged.json");
  fs.writeFileSync(outputFile, JSON.stringify(mergedSwagger, null, 2));

  console.log("✅ Successfully merged swagger files into:", outputFile);
  console.log(
    `📊 Merged ${Object.keys(mergedSwagger.paths).length} paths and ${
      Object.keys(mergedSwagger.components.schemas).length
    } schemas`
  );
}

// Install js-yaml if not available
try {
  require("js-yaml");
  mergeSwagger();
} catch (e) {
  console.log("📦 Installing js-yaml dependency...");
  const { execSync } = require("child_process");
  try {
    execSync("npm install js-yaml", { stdio: "inherit" });
    console.log("✅ js-yaml installed successfully");
    mergeSwagger();
  } catch (installError) {
    console.error("❌ Failed to install js-yaml. Please install it manually:");
    console.error("npm install js-yaml");
    process.exit(1);
  }
}
