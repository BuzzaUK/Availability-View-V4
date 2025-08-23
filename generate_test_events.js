const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

async function generateTestEvents() {
  try {
    console.log('🔄 Generating realistic test event data...');
    
    // Get current assets and shift
    const [assets] = await sequelize.query('SELECT * FROM assets ORDER BY id');
    const [currentShift] = await sequelize.query(`
      SELECT * FROM shifts 
      WHERE end_time IS NULL OR status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (assets.length === 0) {
      console.log('❌ No assets found in database');
      return;
    }
    
    if (currentShift.length === 0) {
      console.log('❌ No active shift found');
      return;
    }
    
    const shift = currentShift[0];
    const shiftStart = new Date(shift.start_time);
    const now = new Date();
    
    console.log(`📊 Generating events for shift: ${shift.shift_name}`);
    console.log(`   Started: ${shiftStart.toLocaleString()}`);
    console.log(`   Assets: ${assets.map(a => a.name).join(', ')}`);
    
    // Generate realistic event timeline
    const events = [];
    let currentTime = new Date(shiftStart.getTime() + 30 * 60 * 1000); // Start 30 minutes into shift
    
    // Simulate a typical 8-hour manufacturing shift
    const shiftDurationHours = 8;
    const endTime = new Date(shiftStart.getTime() + shiftDurationHours * 60 * 60 * 1000);
    
    // Event patterns for different assets
    const eventPatterns = {
      'conveyor': {
        states: ['RUNNING', 'STOPPED', 'MAINTENANCE'],
        avgRunTime: 45, // minutes
        avgStopTime: 15, // minutes
        maintenanceChance: 0.1
      },
      'press': {
        states: ['RUNNING', 'STOPPED', 'MAINTENANCE', 'SETUP'],
        avgRunTime: 60, // minutes
        avgStopTime: 20, // minutes
        maintenanceChance: 0.15,
        setupChance: 0.2
      }
    };
    
    // Generate events for each asset
    for (const asset of assets) {
      const pattern = eventPatterns[asset.type] || eventPatterns['conveyor'];
      let assetCurrentTime = new Date(currentTime);
      let currentState = 'STOPPED';
      let eventCount = 0;
      
      console.log(`\n🔧 Generating events for ${asset.name} (${asset.type})...`);
      
      while (assetCurrentTime < endTime && assetCurrentTime < now) {
        // Determine next state
        let nextState;
        const random = Math.random();
        
        if (currentState === 'STOPPED') {
          if (random < pattern.setupChance && pattern.setupChance) {
            nextState = 'SETUP';
          } else if (random < pattern.maintenanceChance) {
            nextState = 'MAINTENANCE';
          } else {
            nextState = 'RUNNING';
          }
        } else if (currentState === 'RUNNING') {
          if (random < pattern.maintenanceChance) {
            nextState = 'MAINTENANCE';
          } else {
            nextState = 'STOPPED';
          }
        } else if (currentState === 'SETUP') {
          nextState = 'RUNNING';
        } else if (currentState === 'MAINTENANCE') {
          nextState = 'STOPPED';
        }
        
        // Calculate duration based on state
        let duration;
        if (nextState === 'RUNNING') {
          duration = pattern.avgRunTime + (Math.random() - 0.5) * 30; // ±15 min variation
        } else if (nextState === 'STOPPED') {
          duration = pattern.avgStopTime + (Math.random() - 0.5) * 10; // ±5 min variation
        } else if (nextState === 'MAINTENANCE') {
          duration = 30 + Math.random() * 60; // 30-90 minutes
        } else if (nextState === 'SETUP') {
          duration = 10 + Math.random() * 20; // 10-30 minutes
        }
        
        duration = Math.max(5, duration); // Minimum 5 minutes
        
        // Create event
        const event = {
          asset_id: asset.id,
          event_type: 'STATE_CHANGE',
          previous_state: currentState,
          new_state: nextState,
          timestamp: assetCurrentTime.toISOString(),
          duration: Math.round(duration * 60 * 1000), // Convert to milliseconds
          stop_reason: generateEventNotes(currentState, nextState),
          logger_id: asset.logger_id
        };
        
        events.push(event);
        eventCount++;
        
        // Update for next iteration
        currentState = nextState;
        assetCurrentTime = new Date(assetCurrentTime.getTime() + duration * 60 * 1000);
        
        // Add some randomness to prevent too regular patterns
        assetCurrentTime = new Date(assetCurrentTime.getTime() + (Math.random() - 0.5) * 10 * 60 * 1000);
      }
      
      console.log(`   Generated ${eventCount} events`);
    }
    
    // Add some random operational events
    const operationalEvents = [
      'QUALITY_CHECK',
      'MATERIAL_CHANGE',
      'OPERATOR_BREAK',
      'SHIFT_HANDOVER',
      'EQUIPMENT_INSPECTION'
    ];
    
    for (let i = 0; i < 10; i++) {
      const randomAsset = assets[Math.floor(Math.random() * assets.length)];
      const randomEventType = operationalEvents[Math.floor(Math.random() * operationalEvents.length)];
      const randomTime = new Date(shiftStart.getTime() + Math.random() * (now.getTime() - shiftStart.getTime()));
      
      events.push({
        asset_id: randomAsset.id,
        event_type: randomEventType,
        previous_state: null,
        new_state: null,
        timestamp: randomTime.toISOString(),
        duration: Math.round((5 + Math.random() * 25) * 60 * 1000), // 5-30 minutes in milliseconds
        stop_reason: `${randomEventType.replace('_', ' ').toLowerCase()} completed`,
        logger_id: randomAsset.logger_id
      });
    }
    
    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log(`\n📊 Generated ${events.length} total events`);
    
    // Insert events into database
    console.log('💾 Inserting events into database...');
    
    for (const event of events) {
      await sequelize.query(`
        INSERT INTO events (
          asset_id, event_type, previous_state, new_state, 
          timestamp, duration, stop_reason, logger_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, {
        replacements: [
          event.asset_id,
          event.event_type,
          event.previous_state,
          event.new_state,
          event.timestamp,
          event.duration,
          event.stop_reason,
          event.logger_id
        ]
      });
    }
    
    console.log('✅ Test events generated successfully!');
    
    // Update asset states to reflect latest events
    console.log('🔄 Updating asset states...');
    
    for (const asset of assets) {
      const assetEvents = events.filter(e => e.asset_id === asset.id && e.new_state);
      if (assetEvents.length > 0) {
        const latestEvent = assetEvents[assetEvents.length - 1];
        await sequelize.query(`
          UPDATE assets 
          SET current_state = ?, last_state_change = ?
          WHERE id = ?
        `, {
          replacements: [latestEvent.new_state, latestEvent.timestamp, asset.id]
        });
      }
    }
    
    console.log('✅ Asset states updated!');
    
    // Show summary
    const [eventSummary] = await sequelize.query(`
      SELECT event_type, COUNT(*) as count
      FROM events
      WHERE timestamp >= ?
      GROUP BY event_type
      ORDER BY count DESC
    `, {
      replacements: [shift.start_time]
    });
    
    console.log('\n📈 Event Summary for Current Shift:');
    eventSummary.forEach(summary => {
      console.log(`  ${summary.event_type}: ${summary.count} events`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

function generateEventNotes(previousState, newState) {
  const transitions = {
    'STOPPED_RUNNING': 'Equipment started - normal operation',
    'RUNNING_STOPPED': 'Equipment stopped - planned shutdown',
    'STOPPED_MAINTENANCE': 'Maintenance started - scheduled service',
    'MAINTENANCE_STOPPED': 'Maintenance completed - equipment ready',
    'STOPPED_SETUP': 'Setup started - preparing for production',
    'SETUP_RUNNING': 'Setup completed - production started',
    'RUNNING_MAINTENANCE': 'Emergency maintenance - equipment issue detected'
  };
  
  const key = `${previousState}_${newState}`;
  return transitions[key] || `State changed from ${previousState} to ${newState}`;
}

generateTestEvents();