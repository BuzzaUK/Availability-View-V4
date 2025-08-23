const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123'
};

class EventArchiveChecker {
  constructor() {
    this.authToken = null;
  }

  async authenticate() {
    try {
      console.log('🔐 Authenticating...');
      const response = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
      this.authToken = response.data.token;
      console.log('✅ Authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async checkEventArchives() {
    console.log('🔍 CHECKING EVENT ARCHIVES IN DATABASE');
    console.log('=' .repeat(60));
    
    try {
      // Check event archives endpoint
      console.log('\n📋 Step 1: Checking event archives API endpoint...');
      const eventArchivesResponse = await axios.get(`${BASE_URL}/api/archives/events`, {
        headers: await this.getAuthHeaders()
      });
      
      const eventArchives = eventArchivesResponse.data.data || eventArchivesResponse.data || [];
      console.log(`📊 Event archives found via API: ${eventArchives.length}`);
      
      if (eventArchives.length > 0) {
        console.log('\n📋 Event Archives Details:');
        eventArchives.forEach((archive, index) => {
          console.log(`  ${index + 1}. ID: ${archive.id}, Title: ${archive.title || 'No title'}`);
          console.log(`     Created: ${archive.created_at || 'Unknown'}`);
          console.log(`     Type: ${archive.type || 'Unknown'}`);
          if (archive.archived_data) {
            console.log(`     Data keys: ${Object.keys(archive.archived_data).join(', ')}`);
          }
        });
      } else {
        console.log('❌ No event archives found via API');
      }
      
    } catch (error) {
      console.error('❌ Error checking event archives API:', error.response?.data?.message || error.message);
      console.log('💡 This might indicate the endpoint doesn\'t exist or has authentication issues');
    }
    
    try {
      // Check general archives endpoint for events
      console.log('\n📋 Step 2: Checking general archives endpoint for events...');
      const generalArchivesResponse = await axios.get(`${BASE_URL}/api/archives`, {
        headers: await this.getAuthHeaders()
      });
      
      const allArchives = generalArchivesResponse.data.data || generalArchivesResponse.data || [];
      console.log(`📊 Total archives found: ${allArchives.length}`);
      
      // Filter for event-related archives
      const eventRelatedArchives = allArchives.filter(archive => 
        archive.type === 'event' || 
        (archive.title && archive.title.toLowerCase().includes('event')) ||
        (archive.archived_data && archive.archived_data.events)
      );
      
      console.log(`📊 Event-related archives: ${eventRelatedArchives.length}`);
      
      if (eventRelatedArchives.length > 0) {
        console.log('\n📋 Event-Related Archives:');
        eventRelatedArchives.forEach((archive, index) => {
          console.log(`  ${index + 1}. ID: ${archive.id}, Type: ${archive.type}, Title: ${archive.title}`);
        });
      }
      
      // Show all archive types for reference
      const archiveTypes = [...new Set(allArchives.map(archive => archive.type).filter(type => type))];
      console.log(`\n📊 All archive types found: [${archiveTypes.join(', ')}]`);
      
    } catch (error) {
      console.error('❌ Error checking general archives:', error.response?.data?.message || error.message);
    }
    
    try {
      // Check if there's a specific events endpoint
      console.log('\n📋 Step 3: Checking events endpoint...');
      const eventsResponse = await axios.get(`${BASE_URL}/api/events`, {
        headers: await this.getAuthHeaders()
      });
      
      const events = eventsResponse.data.data || eventsResponse.data || [];
      console.log(`📊 Current events found: ${events.length}`);
      
      if (events.length > 0) {
        console.log('\n📋 Recent Events (first 5):');
        events.slice(0, 5).forEach((event, index) => {
          console.log(`  ${index + 1}. ID: ${event.id}, Type: ${event.event_type || 'Unknown'}`);
          console.log(`     Asset: ${event.asset_name || event.asset_id || 'Unknown'}`);
          console.log(`     Time: ${event.timestamp || event.created_at || 'Unknown'}`);
        });
        
        console.log('\n💡 Events exist but may not be archived yet');
        console.log('💡 Check if there\'s an archiving process for events');
      } else {
        console.log('❌ No current events found');
      }
      
    } catch (error) {
      console.error('❌ Error checking events:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🏁 EVENT ARCHIVE CHECK COMPLETE');
    console.log('=' .repeat(60));
  }

  async runCheck() {
    const authenticated = await this.authenticate();
    if (!authenticated) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
    
    await this.checkEventArchives();
  }
}

// Run the check
const checker = new EventArchiveChecker();
checker.runCheck().catch(console.error);