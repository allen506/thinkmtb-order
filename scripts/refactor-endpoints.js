#!/usr/bin/env node

/**
 * Automated Endpoint Refactoring Script
 * Converts sync database calls to async pattern for PostgreSQL
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

const ROUTE_PATTERN = "src/app/api/**/route.ts";

function refactorEndpoint(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;

  // Replace imports
  content = content.replace(
    /import\s*{\s*getDb\s*}\s*from\s*["']@\/lib\/db["']/,
    `import {
  query,
  queryOne,
  execute,
  withTransaction,
  extractContext,
  requireAuth,
  requireAdmin,
  errorResponse,
  successResponse,
} from "@/lib/route-helpers"`
  );

  // Replace getDb() calls with async versions
  // Pattern 1: const db = getDb();
  content = content.replace(
    /const\s+db\s*=\s*getDb\(\);/g,
    "// Database calls are now async - see comments below"
  );

  // Pattern 2: db.prepare(...).get(...) -> await queryOne(...)
  content = content.replace(
    /db\s*\.\s*prepare\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.\s*get\s*\(\s*([^)]+)\s*\)/g,
    "await queryOne($1, [$2])"
  );

  // Pattern 3: db.prepare(...).all(...) -> await query(...)
  content = content.replace(
    /db\s*\.\s*prepare\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.\s*all\s*\(\s*([^)]*)\s*\)/g,
    "await query($1, [$2])"
  );

  // Pattern 4: db.prepare(...).run(...) -> await execute(...)
  content = content.replace(
    /db\s*\.\s*prepare\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.\s*run\s*\(\s*([^)]+)\s*\)/g,
    "await execute($1, [$2])"
  );

  // Replace NextResponse.json with helper functions
  content = content.replace(
    /NextResponse\.json\(\s*{\s*error\s*:\s*["']([^"']+)["']\s*}\s*,\s*{\s*status\s*:\s*(\d+)\s*}\s*\)/g,
    'errorResponse("$1", $2)'
  );

  content = content.replace(
    /NextResponse\.json\(\s*{\s*error\s*:\s*["']([^"']+)["']\s*}\s*,\s*{\s*status\s*:\s*(\d+)\s*}\s*\)/g,
    'errorResponse("$1", $2)'
  );

  // Make functions async
  if (
    content.includes("export async function GET") ||
    content.includes("export function GET")
  ) {
    content = content.replace(
      /export\s+async\s+function\s+GET/,
      "export async function GET"
    );
    content = content.replace(
      /export\s+function\s+GET\s*\(/,
      "export async function GET("
    );
  }

  if (
    content.includes("export async function POST") ||
    content.includes("export function POST")
  ) {
    content = content.replace(
      /export\s+async\s+function\s+POST/,
      "export async function POST"
    );
    content = content.replace(
      /export\s+function\s+POST\s*\(/,
      "export async function POST("
    );
  }

  // Add extractContext helper if not present
  if (
    !content.includes("extractContext") &&
    content.includes('request.headers.get("x-tenant-slug")')
  ) {
    // This endpoint needs context extraction
    content = content.replace(
      /const\s+(\w+)Slug\s*=\s*request\.headers\.get\s*\(\s*["']x-tenant-slug["']\s*\)\s*\|\|\s*["']default["']/,
      'const ctx = extractContext(request);\n  const $1Slug = ctx.tenantSlug'
    );
  }

  // Only write if changes were made
  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  }

  return false;
}

// Main execution
const routeFiles = glob.sync(ROUTE_PATTERN);
console.log(`Found ${routeFiles.length} route files to refactor\n`);

let successCount = 0;
let skipCount = 0;

routeFiles.forEach((file) => {
  try {
    const wasRefactored = refactorEndpoint(file);
    if (wasRefactored) {
      console.log(`✅ ${file}`);
      successCount++;
    } else {
      console.log(`⊘ ${file} (no changes needed)`);
      skipCount++;
    }
  } catch (error) {
    console.log(`❌ ${file}: ${error.message}`);
  }
});

console.log(`\n📊 Results:`);
console.log(`  ✅ Refactored: ${successCount}`);
console.log(`  ⊘ Skipped: ${skipCount}`);
console.log(`  ⏳ Total: ${routeFiles.length}\n`);

if (successCount > 0) {
  console.log(`✨ Refactoring complete! Don't forget to:`);
  console.log(`  1. Review all changes for correctness`);
  console.log(`  2. Update query parameter handling ($ vs ?)`);
  console.log(`  3. Handle PostgreSQL datetime functions`);
  console.log(`  4. Test all endpoints thoroughly`);
  console.log(`  5. Deploy with DATABASE_URL set`);
}
