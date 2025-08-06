import React, { createContext, useState, useEffect, useContext } from 'react';
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

  // Fetch assets via HTTP API as fallback
  const fetchAssets = async () => {
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
  };

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

      // Asset state updates
      socketInstance.on('asset_update', (updatedAsset) => {
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

      // New event received
      socketInstance.on('new_event', (newEvent) => {
        setEvents(prevEvents => [newEvent, ...prevEvents]);
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

  // Request initial data when connected and fetch assets via HTTP as fallback
  useEffect(() => {
    if (socket && connected) {
      socket.emit('get_initial_data');
      // Fallback: fetch assets via HTTP API since backend doesn't handle get_initial_data
      fetchAssets();
    }
  }, [socket, connected]);

  // Also fetch assets when authenticated (even without socket)
  useEffect(() => {
    if (isAuthenticated) {
      fetchAssets();
    }
  }, [isAuthenticated]);

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
        setCurrentShift
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;