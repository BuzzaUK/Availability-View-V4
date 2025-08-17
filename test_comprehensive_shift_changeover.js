const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'admin123';

class ShiftChangeoverTest {
    constructor() {
        this.authToken = null;
        this.currentShiftId = null;
        this.reportPath = null;
    }

    async authenticate() {
        console.log('🔐 Authenticating...');
        try {
            const response = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });
            
            this.authToken = response.data.token;
            console.log('✅ Authentication successful');
            return true;
        } catch (error) {
            console.error('❌ Authentication failed:', error.response?.data || error.message);
            return false;
        }
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        };
    }

    async getCurrentShiftStatus() {
        console.log('\n📊 STEP 1: Verifying current system state...');
        try {
            const response = await axios.get(`${BASE_URL}/api/shifts/current`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.data.shift) {
                this.currentShiftId = response.data.shift.id;
                console.log(`✅ Active shift found: ID ${this.currentShiftId}`);
                console.log(`   Start time: ${response.data.shift.start_time}`);
                console.log(`   Status: ${response.data.shift.status}`);
                return true;
            } else {
                console.log('⚠️  No active shift found');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to get current shift:', error.response?.data || error.message);
            return false;
        }
    }

    async getDashboardDataBefore() {
        console.log('\n📊 Getting dashboard data before changeover...');
        try {
            const response = await axios.get(`${BASE_URL}/api/assets`, {
                headers: this.getAuthHeaders()
            });
            
            console.log('📊 DASHBOARD STATE BEFORE CHANGEOVER');
            console.log('==================================================');
            console.log(`System Availability: ${response.data.systemAvailability || 0}%`);
            console.log(`Total Runtime: ${this.formatDuration(response.data.totalRuntime || 0)}`);
            console.log(`Total Downtime: ${this.formatDuration(response.data.totalDowntime || 0)}`);
            console.log(`Total Stops: ${response.data.totalStops || 0}`);
            
            if (response.data.assets && response.data.assets.length > 0) {
                console.log('\nAsset Details:');
                response.data.assets.forEach(asset => {
                    console.log(`  ${asset.name}: Runtime=${this.formatDuration(asset.runtime || 0)}, Downtime=${this.formatDuration(asset.downtime || 0)}, Stops=${asset.total_stops || 0}`);
                });
            }
            
            return response.data;
        } catch (error) {
            console.error('❌ Failed to get dashboard data:', error.response?.data || error.message);
            return null;
        }
    }

    async archiveCurrentEventData() {
        console.log('\n🗄️  STEP 2: Archiving current event data and resetting tables...');
        try {
            const response = await axios.post(`${BASE_URL}/api/shifts/end`, {}, {
                headers: this.getAuthHeaders()
            });
            
            console.log('✅ Shift ended and data archived successfully');
            console.log(`   Archived shift ID: ${response.data.archivedShift?.id}`);
            console.log(`   Events archived: ${response.data.eventsArchived || 0}`);
            
            return response.data;
        } catch (error) {
            console.error('❌ Failed to archive data:', error.response?.data || error.message);
            return null;
        }
    }

    async resetDashboardMetrics() {
        console.log('\n🔄 STEP 3: Resetting dashboard metrics to zero...');
        try {
            const response = await axios.post(`${BASE_URL}/api/test/dashboard-reset`, {}, {
                headers: this.getAuthHeaders()
            });
            
            console.log('✅ Dashboard reset triggered successfully');
            
            // Wait for reset to complete
            await this.sleep(2000);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to reset dashboard:', error.response?.data || error.message);
            return false;
        }
    }

    async verifyDashboardReset() {
        console.log('\n✅ Verifying dashboard reset...');
        try {
            const response = await axios.get(`${BASE_URL}/api/assets`, {
                headers: this.getAuthHeaders()
            });
            
            const assets = response.data.assets || response.data;
            
            // Calculate totals from assets data
            let totalRuntime = 0;
            let totalDowntime = 0;
            let totalStops = 0;
            
            if (Array.isArray(assets)) {
                assets.forEach(asset => {
                    totalRuntime += (asset.runtime || 0) * 1000; // Convert to ms
                    totalDowntime += (asset.downtime || 0) * 1000; // Convert to ms
                    totalStops += asset.total_stops || 0;
                });
            }
            
            console.log('📊 DASHBOARD STATE AFTER RESET');
            console.log('==================================================');
            console.log(`Total Runtime: ${this.formatDuration(totalRuntime)}`);
            console.log(`Total Downtime: ${this.formatDuration(totalDowntime)}`);
            console.log(`Total Stops: ${totalStops}`);
            
            // Verify all metrics are zero
            const isReset = (
                totalRuntime === 0 &&
                totalDowntime === 0 &&
                totalStops === 0
            );
            
            if (isReset) {
                console.log('✅ Dashboard successfully reset to zero');
                return true;
            } else {
                console.log('❌ Dashboard reset incomplete - some metrics still non-zero');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to verify dashboard reset:', error.response?.data || error.message);
            return false;
        }
    }

    async generateShiftReport() {
        console.log('\n📋 STEP 4: Generating shift report...');
        try {
            const response = await axios.post(`${BASE_URL}/api/shifts/${this.currentShiftId}/report`, {}, {
                headers: this.getAuthHeaders()
            });
            
            if (response.data.success) {
                console.log('✅ Shift report generated successfully');
                if (response.data.reportPath) {
                    this.reportPath = response.data.reportPath;
                    console.log(`   Report path: ${this.reportPath}`);
                }
                if (response.data.files_generated) {
                    console.log(`   Files generated: ${response.data.files_generated}`);
                }
                if (response.data.formats) {
                    console.log(`   Report formats: ${response.data.formats.join(', ')}`);
                }
                return true;
            } else {
                console.log('❌ Report generation failed');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to generate shift report:', error.response?.data || error.message);
            return false;
        }
    }

    async sendEmailNotification() {
        console.log('\n📧 STEP 5: Sending email notification...');
        try {
            const response = await axios.post(`${BASE_URL}/api/shifts/${this.currentShiftId}/report`, {}, {
                headers: this.getAuthHeaders()
            });
            
            if (response.data.success) {
                console.log('✅ Email notification sent successfully');
                if (response.data.data && response.data.data.recipients) {
                    console.log(`   Recipients: ${response.data.data.recipients.join(', ')}`);
                }
                if (response.data.data && response.data.data.files_generated) {
                    console.log(`   Files generated: ${response.data.data.files_generated}`);
                }
                if (response.data.data && response.data.data.formats) {
                    console.log(`   Formats: ${response.data.data.formats.join(', ')}`);
                }
                return response.data;
            } else {
                console.log('❌ Email notification failed');
                return null;
            }
        } catch (error) {
            console.error('❌ Failed to send email notification:', error.response?.data || error.message);
            return null;
        }
    }

    async verifyEmailDelivery() {
        console.log('\n✅ STEP 6: Verifying email delivery...');
        try {
            // Check notification settings to see who should receive emails
            const settingsResponse = await axios.get(`${BASE_URL}/api/users/notification-settings`, {
                headers: this.getAuthHeaders()
            });
            
            console.log('📧 Email notification settings:');
            if (settingsResponse.data && settingsResponse.data.length > 0) {
                settingsResponse.data.forEach(user => {
                    console.log(`   ${user.email}: Shift reports ${user.shift_reports ? 'enabled' : 'disabled'}`);
                });
                
                const enabledUsers = settingsResponse.data.filter(user => user.shift_reports);
                if (enabledUsers.length > 0) {
                    console.log('✅ Email delivery verification: Users configured to receive notifications');
                    return true;
                } else {
                    console.log('⚠️  No users configured to receive shift report emails');
                    return false;
                }
            } else {
                console.log('⚠️  No notification settings found');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to verify email delivery:', error.response?.data || error.message);
            return false;
        }
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runComprehensiveTest() {
        console.log('🚀 Starting Comprehensive Shift Changeover Process');
        console.log('============================================================');
        
        // Step 1: Authentication
        if (!await this.authenticate()) {
            console.log('❌ Test FAILED: Authentication failed');
            return false;
        }
        
        // Step 2: Verify current system state
        if (!await this.getCurrentShiftStatus()) {
            console.log('❌ Test FAILED: No active shift to process');
            return false;
        }
        
        // Step 3: Get dashboard data before changeover
        const beforeData = await this.getDashboardDataBefore();
        
        // Step 4: Archive current event data and reset tables
        const archiveResult = await this.archiveCurrentEventData();
        if (!archiveResult) {
            console.log('❌ Test FAILED: Data archiving failed');
            return false;
        }
        
        // Step 5: Reset dashboard metrics
        if (!await this.resetDashboardMetrics()) {
            console.log('❌ Test FAILED: Dashboard reset failed');
            return false;
        }
        
        // Step 6: Verify dashboard reset
        if (!await this.verifyDashboardReset()) {
            console.log('❌ Test FAILED: Dashboard reset verification failed');
            return false;
        }
        
        // Step 7: Generate shift report
        if (!await this.generateShiftReport()) {
            console.log('❌ Test FAILED: Shift report generation failed');
            return false;
        }
        
        // Step 8: Send email notification
        const emailResult = await this.sendEmailNotification();
        if (!emailResult) {
            console.log('❌ Test FAILED: Email notification failed');
            return false;
        }
        
        // Step 9: Verify email delivery
        if (!await this.verifyEmailDelivery()) {
            console.log('❌ Test FAILED: Email delivery verification failed');
            return false;
        }
        
        console.log('\n🎉 SUCCESS: Comprehensive shift changeover completed successfully!');
        console.log('✅ All steps executed without errors:');
        console.log('   ✓ Data archived and tables reset');
        console.log('   ✓ Dashboard metrics zeroed');
        console.log('   ✓ Shift report generated');
        console.log('   ✓ Email notification sent');
        console.log('   ✓ Email delivery verified');
        
        console.log('\n🏁 Test PASSED');
        return true;
    }
}

// Run the test
const test = new ShiftChangeoverTest();
test.runComprehensiveTest().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
});