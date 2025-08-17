const reportController = require('./src/backend/controllers/reportController');

async function testShiftReportsController() {
  try {
    console.log('Testing reportController.getShiftReports()...');
    
    // Mock request and response objects
    const mockReq = {
      query: {
        page: 1,
        limit: 10,
        search: '',
        startDate: undefined,
        endDate: undefined
      }
    };
    
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('Response status:', this.statusCode);
        console.log('Response data:', JSON.stringify(data, null, 2));
        return this;
      }
    };
    
    // Call the controller function
    await reportController.getShiftReports(mockReq, mockRes);
    
  } catch (error) {
    console.error('Error testing shift reports controller:', error.message);
    console.error(error.stack);
  }
}

testShiftReportsController().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});