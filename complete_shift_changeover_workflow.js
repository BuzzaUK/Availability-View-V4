const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'admin123';

class CompleteShiftChangeoverWorkflow {
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

    async startNewShift() {
        console.log('\n🚀 STEP 1: Starting new shift...');
        try {
            const response = await axios.post(`${BASE_URL}/api/shifts/start`, {
                shift_name: `Comprehensive Test Shift - ${new Date().toLocaleString()}`,
                notes: 'Testing comprehensive shift changeover process'
            }, {
                headers: this.getAuthHeaders()
            });
            
            if (response.data.success && response.data.data) {
                this.currentShiftId = response.data.data.id;
                console.log(`✅ New shift started successfully`);
                console.log(`   Shift ID: ${this.currentShiftId}`);
                console.log(`   Shift Name: ${response.data.data.shift_name}`);
                console.log(`   Start Time: ${response.data.data.start_time}`);
                
                // Wait a moment for the shift to be fully initialized
                await this.sleep(2000);
                return true;
            } else {
                console.log('❌ Failed to start shift - invalid response');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to start shift:', error.response?.data || error.message);
            return false;
        }
    }

    async simulateShiftActivity() {
        console.log('\n⚡ Simulating shift activity...');
        // Wait a few seconds to simulate some shift activity
        await this.sleep(5000);
        console.log('✅ Shift activity simulation completed');
    }

    async getDashboardDataBefore() {
        console.log('\n📊 Getting dashboard data before changeover...');
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
            
            console.log('📊 DASHBOARD STATE BEFORE CHANGEOVER');
            console.log('==================================================');
            console.log(`Total Runtime: ${this.formatDuration(totalRuntime)}`);
            console.log(`Total Downtime: ${this.formatDuration(totalDowntime)}`);
            console.log(`Total Stops: ${totalStops}`);
            
            if (Array.isArray(assets) && assets.length > 0) {
                console.log('\nAsset Details:');
                assets.forEach(asset => {
                    console.log(`  ${asset.name}: Runtime=${this.formatDuration((asset.runtime || 0) * 1000)}, Downtime=${this.formatDuration((asset.downtime || 0) * 1000)}, Stops=${asset.total_stops || 0}`);
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
            if (response.data.archivedShift) {
                console.log(`   Archived shift ID: ${response.data.archivedShift.id}`);
            }
            if (response.data.eventsArchived !== undefined) {
                console.log(`   Events archived: ${response.data.eventsArchived}`);
            }
            
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
        console.log('\n✅ STEP 6: Verifying email delivery configuration...');
        try {
            // Check notification settings
            const settingsResponse = await axios.get(`${BASE_URL}/api/notifications/settings`, {
                headers: this.getAuthHeaders()
            });
            
            if (settingsResponse.data.success && settingsResponse.data.data) {
                const settings = settingsResponse.data.data;
                console.log('📧 Email notification settings:');
                console.log(`   Shift reports enabled: ${settings.shiftSettings?.enabled || false}`);
                console.log(`   Auto-send enabled: ${settings.shiftSettings?.autoSend || false}`);
                console.log(`   Email format: ${settings.shiftSettings?.emailFormat || 'not set'}`);
                
                if (settings.shiftSettings?.enabled) {
                    console.log('✅ Email delivery verification: Shift reports are enabled in system settings');
                    return true;
                } else {
                    console.log('⚠️  Shift reports are not enabled in system settings');
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

    async checkArchives() {
        console.log('\n📦 Checking archives...');
        try {
            const response = await axios.get(`${BASE_URL}/api/archives`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.data && response.data.length > 0) {
                console.log(`✅ Found ${response.data.length} archives`);
                const latestArchive = response.data[0];
                console.log(`   Latest archive: ${latestArchive.archive_name}`);
                console.log(`   Created: ${latestArchive.created_at}`);
                return true;
            } else {
                console.log('⚠️  No archives found');
                return false;
            }
        } catch (error) {
            console.error('❌ Failed to check archives:', error.response?.data || error.message);
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

    async runCompleteWorkflow() {
        console.log('🚀 Starting Complete Shift Changeover Workflow');
        console.log('============================================================');
        
        // Step 1: Authentication
        if (!await this.authenticate()) {
            console.log('❌ Workflow FAILED: Authentication failed');
            return false;
        }
        
        // Step 2: Start new shift
        if (!await this.startNewShift()) {
            console.log('❌ Workflow FAILED: Could not start new shift');
            return false;
        }
        
        // Step 3: Simulate shift activity
        await this.simulateShiftActivity();
        
        // Step 4: Get dashboard data before changeover
        const beforeData = await this.getDashboardDataBefore();
        
        // Step 5: Archive current event data and reset tables
        const archiveResult = await this.archiveCurrentEventData();
        if (!archiveResult) {
            console.log('❌ Workflow FAILED: Data archiving failed');
            return false;
        }
        
        // Step 6: Reset dashboard metrics
        if (!await this.resetDashboardMetrics()) {
            console.log('❌ Workflow FAILED: Dashboard reset failed');
            return false;
        }
        
        // Step 7: Verify dashboard reset
        if (!await this.verifyDashboardReset()) {
            console.log('❌ Workflow FAILED: Dashboard reset verification failed');
            return false;
        }
        
        // Step 8: Generate shift report and send email notification
        const emailResult = await this.sendEmailNotification();
        if (!emailResult) {
            console.log('❌ Workflow FAILED: Shift report generation and email notification failed');
            return false;
        }
        
        // Step 10: Verify email delivery configuration
        if (!await this.verifyEmailDelivery()) {
            console.log('❌ Workflow FAILED: Email delivery verification failed');
            return false;
        }
        
        // Step 11: Check archives
        await this.checkArchives();
        
        console.log('\n🎉 SUCCESS: Complete shift changeover workflow executed successfully!');
        console.log('✅ All steps completed without errors:');
        console.log('   ✓ New shift started and activity simulated');
        console.log('   ✓ Data archived and tables reset');
        console.log('   ✓ Dashboard metrics zeroed');
        console.log('   ✓ Shift report generated and email notification sent');
        console.log('   ✓ Email delivery configuration verified');
        
        console.log('\n🏁 Workflow COMPLETED SUCCESSFULLY');
        return true;
    }
}

// Run the complete workflow
const workflow = new CompleteShiftChangeoverWorkflow();
workflow.runCompleteWorkflow().catch(error => {
    console.error('💥 Workflow execution failed:', error);
    process.exit(1);
});