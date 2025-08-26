const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function createTestArchivedReport() {
  try {
    console.log('🔍 Creating test archived shift report...\n');

    // First, get an existing shift to create an archived report for
    const [shifts] = await sequelize.query(`
      SELECT 
        id,
        shift_name,
        start_time,
        end_time,
        status
      FROM shifts 
      WHERE archived = 0
      ORDER BY start_time DESC
      LIMIT 1
    `);

    if (shifts.length === 0) {
      console.log('❌ No active shifts found to create archived report for');
      return;
    }

    const shift = shifts[0];
    console.log(`📊 Creating archived report for shift: ${shift.shift_name} (ID: ${shift.id})`);

    // Create the archived report entry that matches the user's description
    const reportTitle = `Shift Report - Shift 2 - Sun Aug 17 2025 - 17/08/2025`;
    const reportDescription = `Generated shift report for Shift 2 on August 17, 2025`;

    // Create archived data structure
    const archivedData = {
      shift_id: shift.id,
      report_generation_timestamp: new Date().toISOString(),
      report_formats: ['csv', 'html', 'json'],
      shift_metrics: {
        total_runtime: 480, // 8 hours in minutes
        total_downtime: 60,  // 1 hour in minutes
        availability: 88.89,
        performance: 85.5,
        quality: 95.2,
        oee: 72.1,
        total_stops: 3
      },
      asset_performance: [
        {
          asset_id: 1,
          asset_name: 'Production Line A',
          runtime: 240,
          downtime: 30,
          availability: 88.89
        }
      ],
      reports: {
        csv: 'shift_report_data.csv',
        html: 'shift_report_summary.html',
        json: 'shift_report_data.json'
      },
      generation_metadata: {
        events_processed: 45,
        assets_analyzed: 3,
        report_version: '2.0',
        data_source: 'live_shift_data'
      }
    };

    // Insert the archived report
    const [result] = await sequelize.query(`
      INSERT INTO archives (
        title,
        description,
        archive_type,
        date_range_start,
        date_range_end,
        created_by,
        status,
        archived_data,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        reportTitle,
        reportDescription,
        'SHIFT_REPORT',
        shift.start_time,
        shift.end_time,
        1, // System user
        'COMPLETED',
        JSON.stringify(archivedData),
        new Date().toISOString(),
        new Date().toISOString()
      ]
    });

    console.log(`✅ Test archived report created successfully!`);
    console.log(`   Title: ${reportTitle}`);
    console.log(`   Archive Type: SHIFT_REPORT`);
    console.log(`   Shift ID: ${shift.id}`);
    console.log(`   Status: COMPLETED`);

    // Verify the creation
    const [verifyResult] = await sequelize.query(`
      SELECT 
        id,
        title,
        archive_type,
        status,
        created_at
      FROM archives 
      WHERE archive_type = 'SHIFT_REPORT'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (verifyResult.length > 0) {
      const archive = verifyResult[0];
      console.log(`\n📋 Verification - Archive created with ID: ${archive.id}`);
      console.log(`   Created at: ${archive.created_at}`);
    }

    console.log('\n🎯 Test archived report is now available for Natural Language Reports filtering!');

  } catch (error) {
    console.error('❌ Error creating test archived report:', error);
  } finally {
    await sequelize.close();
  }
}

createTestArchivedReport();