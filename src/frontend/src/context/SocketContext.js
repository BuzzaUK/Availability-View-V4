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

  // Initialize socket connection when authenticated
  useEffect(() => {
    let socketInstance = null;

    if (isAuthenticated && token) {
      // Connect to socket server with auth token
      socketInstance = io('', {
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
        console.log('Socket connected');
        setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
        setConnected(false);
      });

      // Asset configuration updates (only for asset management changes, not state changes)
      socketInstance.on('asset_config_update', (updatedAsset) => {
        setAssets(prevAssets => {
          const index = prevAssets.findIndex(asset => asset._id === updatedAsset._id);
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
        setCurrentShift(shift);
      });

      // Initial data load
      socketInstance.on('initial_data', (data) => {
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
        fetchAllData
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;