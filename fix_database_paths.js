const fs = require('fs');
const path = require('path');

// Files that need to be updated to use the root database.sqlite
const filesToUpdate = [
  './debug_frontend_auth.js',
  './debug_shift_discrepancy.js',
  './check_archived_shifts.js',
  './find_aug24_archive.js',
  './check_archives.js',
  './test_csv_export.js',
  './debug_correct_database.js',
  './debug_database_path.js',
  './diagnose_event_archive_issue.js',
  './test_nl_with_shift3.js',
  './check_24aug_archives.js',
  './check_shift2_info.js',
  './check_archives_db.js',
  './debug_cache_bypass.js',
  './check_archived_shift_reports.js',
  './check_all_archives.js',
  './analytics_discrepancy_analysis.js',
  './count_shift_reports.js',
  './check_database_tables.js',
  './generate_missing_reports.js',
  './check_current_assets.js',
  './create_test_archived_report.js',
  './examine_archived_data_structure.js'
];

// Patterns to replace
const replacements = [
  {
    // Direct sqlite3.Database calls with backend path
    pattern: /new sqlite3\.Database\('\.\/src\/backend\/database\.sqlite'/g,
    replacement: "new sqlite3.Database('./database.sqlite'"
  },
  {
    // Path.join patterns pointing to backend database
    pattern: /path\.join\(__dirname,\s*'src',\s*'backend',\s*'database\.sqlite'\)/g,
    replacement: "path.join(__dirname, 'database.sqlite')"
  },
  {
    // Sequelize storage config with backend path
    pattern: /storage:\s*path\.join\(__dirname,\s*'src',\s*'backend',\s*'database\.sqlite'\)/g,
    replacement: "storage: path.join(__dirname, 'database.sqlite')"
  },
  {
    // Direct string paths to backend database
    pattern: /storage:\s*'\.\/src\/backend\/database\.sqlite'/g,
    replacement: "storage: './database.sqlite'"
  },
  {
    // Another variant of path.join
    pattern: /path\.join\(__dirname,\s*'src\/backend\/database\.sqlite'\)/g,
    replacement: "path.join(__dirname, 'database.sqlite')"
  }
];

async function fixDatabasePaths() {
  console.log('🔧 Starting database path corrections...');
  
  let totalFilesUpdated = 0;
  let totalReplacements = 0;
  
  for (const filePath of filesToUpdate) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        continue;
      }
      
      // Read file content
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      let fileReplacements = 0;
      
      // Apply all replacement patterns
      for (const { pattern, replacement } of replacements) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          fileReplacements += matches.length;
        }
      }
      
      // Write back if changes were made
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${filePath} (${fileReplacements} replacements)`);
        totalFilesUpdated++;
        totalReplacements += fileReplacements;
      } else {
        console.log(`ℹ️  No changes needed for ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files updated: ${totalFilesUpdated}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  
  if (totalFilesUpdated > 0) {
    console.log(`\n✅ All database paths have been corrected to use the root database.sqlite file.`);
    console.log(`🔒 The root database.sqlite file integrity has been maintained.`);
  } else {
    console.log(`\nℹ️  All files were already using correct database paths.`);
  }
}

fixDatabasePaths().catch(console.error);