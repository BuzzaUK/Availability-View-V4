import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import AuthContext from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [assets, setAssets] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [archiveRefreshCallbacks, setArchiveRefreshCallbacks] = useState([]);
  const { isAuthenticated, token } = useContext(AuthContext);

  // Fetch dashboard data (assets only - events are managed by individual pages)
  const fetchAllData = useCallback(async () => {
    console.log('🔄 SocketContext: fetchAllData called at:', new Date().toISOString());
    
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Only fetch assets - events are managed by EventsPage with pagination
      const assetsResponse = await axios.get('/api/assets', { headers });
      
      // Update assets
      if (assetsResponse.data.success) {
        const newAssets = assetsResponse.data.assets || [];
        console.log('✅ SocketContext: Assets fetched via HTTP API:', newAssets.length, 'assets');
        setAssets(newAssets);
      }
      
    } catch (error) {
      console.error('❌ SocketContext: Error fetching assets:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : null
      });
      setAssets([]);
    }
  }, [token]);



  // Fetch assets via HTTP API as fallback
  const fetchAssets = useCallback(async () => {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get('/api/assets', { headers });
      if (response.data.success) {
        setAssets(response.data.assets || []);
        console.log('Assets fetched via HTTP API:', response.data.assets);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      setAssets([]);
    }
  }, [token]);

  // Fetch events via HTTP API
  const fetchEvents = useCallback(async () => {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get('/api/events', { headers });
      if (response.data.success) {
        setEvents(response.data.events || []);
        console.log('Events fetched via HTTP API:', response.data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    }
  }, [token]);

  // Archive refresh callback management
  const registerArchiveRefreshCallback = useCallback((callback) => {
    setArchiveRefreshCallbacks(prev => [...prev, callback]);
    return () => {
      setArchiveRefreshCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  const triggerArchiveRefresh = useCallback(() => {
    archiveRefreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error calling archive refresh callback:', error);
      }
    });
  }, [archiveRefreshCallbacks]);

  // Initialize socket connection when authenticated
  useEffect(() => {
    let socketInstance = null;

    if (isAuthenticated && token) {
      // Connect to socket server with auth token
      socketInstance = io('http://localhost:5000', {
        auth: {
          token
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Socket connection events
      socketInstance.on('connect', () => {
        console.log('✅ SocketContext: Socket connected successfully, ID:', socketInstance.id);
        setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ SocketContext: Socket disconnected');
        setConnected(false);
      });

      socketInstance.on('error', (error) => {
        console.error('❌ SocketContext: Socket error:', error);
        setConnected(false);
      });

      // Asset configuration updates (only for asset management changes, not state changes)
      socketInstance.on('asset_config_update', (updatedAsset) => {
        setAssets(prevAssets => {
          const index = prevAssets.findIndex(asset => asset.id === updatedAsset.id);
          if (index !== -1) {
            const newAssets = [...prevAssets];
            newAssets[index] = updatedAsset;
            return newAssets;
          } else {
            return [...prevAssets, updatedAsset];
          }
        });
      });

      // New event received (for real-time notifications only)
      socketInstance.on('new_event', (newEvent) => {
        console.log('🔔 SocketContext: New event received via socket:', newEvent._id);
        // Only update events if we're on dashboard or other pages that need real-time events
        // EventsPage manages its own events with pagination
        setEvents(prevEvents => [newEvent, ...prevEvents.slice(0, 49)]); // Keep only latest 50 for dashboard
      });

      // Shift updates
      socketInstance.on('shift_update', (shift) => {
        console.log('🔄 SocketContext: shift_update received:', {
          id: shift?.id,
          name: shift?.name,
          start_time: shift?.start_time,
          status: shift?.status,
          rawData: shift
        });
        setCurrentShift(shift);
      });

      // New archive created (for real-time archive list updates)
      socketInstance.on('new_archive', (newArchive) => {
        console.log('🔔 SocketContext: New archive created via socket:', newArchive.title);
        triggerArchiveRefresh();
      });

      // Dashboard reset event (triggered by shift end processing)
      socketInstance.on('dashboard_reset', (resetData) => {
        console.log('🔄 SocketContext: Dashboard reset triggered:', resetData.message);
        // Clear all current data
        setEvents([]);
        setCurrentShift(null);
        // Refresh all data from server
        setTimeout(() => {
          fetchAllData();
        }, 1000); // Small delay to ensure server processing is complete
      });

      // Events table reset event
      socketInstance.on('events_update', (updateData) => {
        console.log('🔔 SocketContext: Events update received:', updateData.action);
        if (updateData.action === 'table_reset') {
          // Clear events and refresh
          setEvents([]);
          setTimeout(() => {
            fetchAllData();
          }, 500);
        }
      });

      // Initial data load
      socketInstance.on('initial_data', (data) => {
        console.log('🔄 SocketContext: initial_data received:', {
          hasAssets: !!data.assets,
          hasEvents: !!data.events,
          hasCurrentShift: !!data.currentShift,
          currentShift: data.currentShift ? {
            id: data.currentShift.id,
            name: data.currentShift.name,
            start_time: data.currentShift.start_time,
            status: data.currentShift.status
          } : null,
          rawData: data
        });
        if (data.assets) setAssets(data.assets);
        if (data.events) setEvents(data.events);
        if (data.currentShift) setCurrentShift(data.currentShift);
      });

      setSocket(socketInstance);

      // Cleanup on unmount
      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
        }
      };
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [isAuthenticated, token]);

  // Fetch initial data when socket connects
  useEffect(() => {
    if (socket && connected) {
      console.log('🔌 Socket connected, fetching initial data... (connected:', connected, ')');
      // Fetch all data via HTTP API when socket connects
      fetchAllData();
    }
  }, [socket, connected, fetchAllData]);

  // Fetch data when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔐 User authenticated, fetching data... (isAuthenticated:', isAuthenticated, ', token exists:', !!token, ')');
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        assets,
        events,
        currentShift,
        setAssets,
        setEvents,
        setCurrentShift,
        fetchAssets,
        fetchEvents,
        fetchAllData,
        registerArchiveRefreshCallback
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;