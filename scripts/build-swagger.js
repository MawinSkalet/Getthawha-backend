#!/usr/bin/env node

/**
 * Build script to merge modular swagger YAML files into a single JSON file
 * Usage: npm run build:swagger
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

console.log("🔨 Building Swagger documentation...");

// Paths
const swaggerDir = path.join(__dirname, "..", "swagger");
const outputFile = path.join(__dirname, "..", "swagger.json");

// Helper function to read and parse YAML files
function readYamlFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return null;
    }
    const content = fs.readFileSync(filePath, "utf8");
    return yaml.load(content, { strict: false });
  } catch (error) {
    console.error(`❌ Error parsing ${filePath}:`, error.message);
    return null;
  }
}

// Main build function
function buildSwagger() {
  // Initialize the final swagger document
  const swaggerDoc = {
    openapi: "3.1.0",
    info: {
      title: "Getthawha API",
      version: "1.0.0",
    },
    paths: {},
    components: {
      schemas: {},
    },
  };

  // Read main swagger.yaml for any additional config
  const mainSwaggerPath = path.join(swaggerDir, "swagger.yaml");
  const mainSwagger = readYamlFile(mainSwaggerPath);
  if (mainSwagger && mainSwagger.info) {
    swaggerDoc.info = { ...swaggerDoc.info, ...mainSwagger.info };
  }
  if (mainSwagger && mainSwagger.openapi) {
    swaggerDoc.openapi = mainSwagger.openapi;
  }

  // List of path files to merge
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
    "admin-review.yaml",
    "admin-users.yaml",
    // User-facing endpoints
    "user-info.yaml",
    "user-branch.yaml",
    "user-package.yaml",
    "user-voucher.yaml",
    "user-review.yaml",
    "testimonials.yaml",
    "upload.yaml",
  ];

  let totalPaths = 0;
  let processedFiles = 0;

  // Process each path file
  pathFiles.forEach((fileName) => {
    const filePath = path.join(swaggerDir, "paths", fileName);
    const pathData = readYamlFile(filePath);

    if (pathData) {
      Object.assign(swaggerDoc.paths, pathData);
      totalPaths += Object.keys(pathData).length;
      processedFiles++;
      console.log(
        `✅ Processed: ${fileName} (${Object.keys(pathData).length} paths)`
      );
    }
  });

  // Read and merge schemas
  const schemasPath = path.join(swaggerDir, "components", "schemas.yaml");
  const schemas = readYamlFile(schemasPath);

  if (schemas) {
    swaggerDoc.components.schemas = schemas;
    console.log(
      `✅ Processed: schemas.yaml (${Object.keys(schemas).length} schemas)`
    );
  }

  // Write the final JSON file
  try {
    fs.writeFileSync(outputFile, JSON.stringify(swaggerDoc, null, 2));
    console.log(`\n🎉 Successfully built swagger.json!`);
    console.log(`📊 Summary:`);
    console.log(`   • Files processed: ${processedFiles}/${pathFiles.length}`);
    console.log(`   • Total paths: ${totalPaths}`);
    console.log(
      `   • Total schemas: ${Object.keys(swaggerDoc.components.schemas).length}`
    );
    console.log(`   • Output: ${path.relative(process.cwd(), outputFile)}`);
  } catch (error) {
    console.error("❌ Error writing swagger.json:", error.message);
    process.exit(1);
  }
}

// Check if js-yaml is available
try {
  require("js-yaml");
  buildSwagger();
} catch (error) {
  console.error("❌ js-yaml is required but not found.");
  console.error("Please install it with: npm install --save-dev js-yaml");
  process.exit(1);
}
