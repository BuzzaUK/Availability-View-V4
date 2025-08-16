import { useEffect, useContext } from 'react';
import SocketContext from '../../context/SocketContext';

const ShiftDebugLogger = () => {
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    // Listen for shift debug messages from the backend
    const handleShiftDebug = (data) => {
      const { level, message, context, timestamp } = data;
      
      // Format the console output with emojis and styling
      const formattedMessage = `🔄 SHIFT DEBUG [${level.toUpperCase()}] ${message}`;
      const contextStr = context ? JSON.stringify(context, null, 2) : '';
      
      // Log to browser console based on level
      switch (level) {
        case 'error':
          console.error(`❌ ${formattedMessage}`, context || '');
          if (context?.stack) {
            console.error('Stack trace:', context.stack);
          }
          break;
        case 'warning':
          console.warn(`⚠️ ${formattedMessage}`, context || '');
          break;
        case 'success':
          console.log(`✅ ${formattedMessage}`, context || '');
          break;
        case 'process':
          console.log(`🔄 ${formattedMessage}`, context || '');
          break;
        case 'debug':
          console.debug(`🔍 ${formattedMessage}`, context || '');
          break;
        case 'info':
        default:
          console.info(`ℹ️ ${formattedMessage}`, context || '');
          break;
      }
      
      // Also create a grouped console entry for detailed context
      if (context && Object.keys(context).length > 0) {
        console.groupCollapsed(`📋 Context for: ${message}`);
        console.table(context);
        console.groupEnd();
      }
    };

    // Listen for shift change events
    const handleShiftChange = (data) => {
      console.group('🔄 SHIFT CHANGE EVENT DETECTED');
      console.log('Event Type:', data.type);
      console.log('Timestamp:', new Date().toISOString());
      console.log('Data:', data);
      console.groupEnd();
    };

    // Listen for archive creation events
    const handleArchiveCreated = (data) => {
      console.group('📦 ARCHIVE CREATED');
      console.log('Archive ID:', data.archiveId);
      console.log('Archive Name:', data.title);
      console.log('Event Count:', data.eventCount);
      console.log('Created At:', new Date().toISOString());
      console.groupEnd();
    };

    // Listen for shift report generation events
    const handleShiftReportGenerated = (data) => {
      console.group('📊 SHIFT REPORT GENERATED');
      console.log('Report Type:', data.type);
      console.log('Shift ID:', data.shiftId);
      console.log('Generated At:', new Date().toISOString());
      console.log('Report Data:', data);
      console.groupEnd();
    };

    // Listen for data processing status
    const handleDataProcessingStatus = (data) => {
      const { status, operation, details } = data;
      
      console.group(`📊 DATA PROCESSING: ${operation.toUpperCase()}`);
      console.log('Status:', status);
      console.log('Operation:', operation);
      if (details) {
        console.log('Details:', details);
      }
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    };

    // Register event listeners
    socket.on('shift_debug', handleShiftDebug);
    socket.on('shift_change', handleShiftChange);
    socket.on('archive_created', handleArchiveCreated);
    socket.on('shift_report_generated', handleShiftReportGenerated);
    socket.on('data_processing_status', handleDataProcessingStatus);

    // Log that debug logger is active
    console.log('🔧 Shift Debug Logger initialized - listening for shift change events');
    console.log('📡 WebSocket connection status:', socket.connected ? 'Connected' : 'Disconnected');

    // Cleanup listeners on unmount
    return () => {
      socket.off('shift_debug', handleShiftDebug);
      socket.off('shift_change', handleShiftChange);
      socket.off('archive_created', handleArchiveCreated);
      socket.off('shift_report_generated', handleShiftReportGenerated);
      socket.off('data_processing_status', handleDataProcessingStatus);
      console.log('🔧 Shift Debug Logger cleanup completed');
    };
  }, [socket]);

  // This component doesn't render anything
  return null;
};

export default ShiftDebugLogger;