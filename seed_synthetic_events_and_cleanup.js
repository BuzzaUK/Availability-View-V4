const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'backend', '.env') });

const crypto = require('crypto');
const databaseService = require('./src/backend/services/databaseService');
const reportService = require('./src/backend/services/reportService');

async function waitForEnterOrTimeout(ms = 120000) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        rl.close();
        resolve('timeout');
      }
    }, ms);

    rl.question(`\nPress Enter to clean up test data now, or wait ${Math.floor(ms / 1000)}s for automatic cleanup... `, () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        rl.close();
        resolve('enter');
      }
    });
  });
}

async function main() {
  const createdEventIds = [];
  let createdShift = null;
  let targetShift = null;
  const batchId = crypto.randomBytes(6).toString('hex');

  console.log('🧪 Synthetic dataset generator');
  console.log('='.repeat(40));

  try {
    // 1) Pick a target shift (prefer current active shift; otherwise create a short synthetic one)
    targetShift = await databaseService.getCurrentShift();
    if (!targetShift) {
      console.log('ℹ️ No active shift found. Creating a short synthetic shift so metrics are scoped.');
      const start = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      createdShift = await databaseService.createShift({
        shift_name: `Synthetic Test Shift (${new Date().toLocaleString()})`,
        shift_number: Math.floor(Math.random() * 100000),
        start_time: start,
        status: 'active',
        notes: 'Temporary synthetic shift for testing metrics'
      });
      targetShift = createdShift;
      console.log('✅ Created synthetic shift:', { id: targetShift.id, name: targetShift.shift_name });
    } else {
      console.log('✅ Using current active shift:', { id: targetShift.id, name: targetShift.shift_name });
    }

    // 2) Pick 1-2 assets to seed
    const assets = await databaseService.getAllAssets();
    if (!assets || assets.length === 0) {
      console.log('\n❌ No assets found. Please create at least one asset in the UI, then re-run this script.');
      return;
    }
    const targetAssets = assets.slice(0, Math.min(2, assets.length));
    console.log(`🔧 Seeding events for ${targetAssets.length} asset(s):`, targetAssets.map(a => `${a.name}#${a.id}`).join(', '));

    // 3) Build a timeline of events to ensure non-zero runtime, downtime and stops
    const now = Date.now();
    const base = Math.max(new Date(targetShift.start_time).getTime(), now - 25 * 60 * 1000); // within last 25 minutes

    const timelines = [
      // Timeline ensures at least one stop > 5 min and one micro-stop < 5 min
      [
        { type: 'STATE_CHANGE', prev: 'STOPPED', next: 'RUNNING', at: base + 0 * 60 * 1000 },
        { type: 'STATE_CHANGE', prev: 'RUNNING', next: 'STOPPED', at: base + 5 * 60 * 1000, reason: 'Setup' }, // 5 min run
        { type: 'STATE_CHANGE', prev: 'STOPPED', next: 'RUNNING', at: base + 8 * 60 * 1000 }, // 3 min stop (micro-stop threshold is 5 min)
        { type: 'STATE_CHANGE', prev: 'RUNNING', next: 'STOPPED', at: base + 14 * 60 * 1000, reason: 'Material shortage' }, // 6 min run
        { type: 'STATE_CHANGE', prev: 'STOPPED', next: 'RUNNING', at: base + 20 * 60 * 1000 }, // 6 min stop (>5m => regular stop)
        { type: 'MICRO_STOP', at: base + 22 * 60 * 1000, duration: 2 * 60 * 1000, reason: 'Minor jam' }, // Explicit micro-stop event
      ],
      // Slightly different timings for a second asset (if present)
      [
        { type: 'STATE_CHANGE', prev: 'STOPPED', next: 'RUNNING', at: base + 1 * 60 * 1000 },
        { type: 'STATE_CHANGE', prev: 'RUNNING', next: 'STOPPED', at: base + 7 * 60 * 1000, reason: 'Quality issue' },
        { type: 'STATE_CHANGE', prev: 'STOPPED', next: 'RUNNING', at: base + 11 * 60 * 1000 },
        { type: 'STATE_CHANGE', prev: 'RUNNING', next: 'STOPPED', at: base + 17 * 60 * 1000, reason: 'Maintenance' },
        { type: 'STATE_CHANGE', prev: 'STOPPED', next: 'RUNNING', at: base + 19 * 60 * 1000 },
      ],
    ];

    // 4) Create events for each selected asset
    for (let i = 0; i < targetAssets.length; i++) {
      const asset = targetAssets[i];
      const plan = timelines[i] || timelines[0];

      for (const step of plan) {
        const common = {
          asset_id: asset.id,
          shift_id: targetShift.id,
          timestamp: new Date(step.at),
          metadata: { synthetic: true, batch_id: batchId }
        };

        if (step.type === 'STATE_CHANGE') {
          const evt = await databaseService.createEvent({
            ...common,
            event_type: 'STATE_CHANGE',
            previous_state: step.prev,
            new_state: step.next,
            stop_reason: step.reason || null,
          });
          createdEventIds.push(evt.id);
        } else if (step.type === 'MICRO_STOP') {
          const evt = await databaseService.createEvent({
            ...common,
            event_type: 'MICRO_STOP',
            duration: step.duration,
            stop_reason: step.reason || 'Micro stop',
          });
          createdEventIds.push(evt.id);
        }
      }
    }

    console.log(`\n✅ Created ${createdEventIds.length} synthetic event(s) with batch_id=${batchId}`);
    console.log('You should now see non-zero runtime, downtime, stops, and micro-stops in analytics.');

    // 5) Optionally generate a report for immediate verification
    try {
      const report = await reportService.generateShiftReport(targetShift.id, { includeAnalysis: true });
      const assetCount = report?.summary?.assets?.length || 0;
      const totalStops = report?.summary?.totals?.stops ?? 'n/a';
      const availability = report?.summary?.totals?.availability ?? 'n/a';
      console.log('\n📄 Shift report quick summary:');
      console.log(' - Assets analyzed:', assetCount);
      console.log(' - Total stops:', totalStops);
      console.log(' - Availability (%):', availability);
    } catch (e) {
      console.log('⚠️ Report generation failed (non-blocking):', e.message);
    }

    // 6) Wait for user to review, then cleanup
-    const choice = await waitForEnterOrTimeout(30000);
+    const choice = await waitForEnterOrTimeout(120000);
    console.log(`\n⏳ Cleanup trigger: ${choice}`);

    if (createdEventIds.length > 0) {
      const deleted = await databaseService.deleteEventsByIds(createdEventIds);
      console.log(`🗑️ Deleted ${deleted} synthetic event(s)`);
    }

    if (createdShift) {
      // End and archive the synthetic shift we created
      try {
        await databaseService.updateShift(createdShift.id, {
          status: 'completed',
          end_time: new Date(),
          archived: true,
          notes: 'Synthetic test shift archived and events cleaned up'
        });
        console.log('🗂️ Archived synthetic shift');
      } catch (e) {
        console.log('⚠️ Failed to archive synthetic shift:', e.message);
      }
    }

    console.log('\n🏁 Done. Test data has been cleaned up.');
  } catch (err) {
    console.error('❌ Error generating synthetic dataset:', err.message);
    console.error(err.stack);
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));