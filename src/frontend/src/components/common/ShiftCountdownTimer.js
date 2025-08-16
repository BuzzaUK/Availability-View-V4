import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { AccessTime as TimeIcon, Warning as WarningIcon } from '@mui/icons-material';
import axios from 'axios';
import SocketContext from '../../context/SocketContext';
import SettingsContext from '../../context/SettingsContext';

const ShiftCountdownTimer = () => {
  const { currentShift } = useContext(SocketContext);
  const { settings } = useContext(SettingsContext);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isNearEnd, setIsNearEnd] = useState(false);
  const [shiftEndTime, setShiftEndTime] = useState(null);
  const [shiftTimes, setShiftTimes] = useState([]);

  // Fetch shift times from notification settings
  useEffect(() => {
    const fetchShiftTimes = async () => {
      try {
        // Try primary endpoint shape
        let response = await axios.get('/api/settings/notifications');
        let fetched = response?.data?.data?.shiftSettings?.shiftTimes 
          || response?.data?.shiftSettings?.shiftTimes 
          || response?.data?.shiftSettings 
          || response?.data?.shiftTimes;

        // Fallback to alternative endpoint if not found
        if (!Array.isArray(fetched) || fetched.length === 0) {
          response = await axios.get('/api/notifications/settings');
          fetched = response?.data?.data?.shiftSettings?.shiftTimes 
            || response?.data?.shiftSettings?.shiftTimes 
            || response?.data?.shiftSettings 
            || response?.data?.shiftTimes;
        }

        if (Array.isArray(fetched) && fetched.length > 0) {
          setShiftTimes(fetched);
        } else {
          throw new Error('Shift times not present in response');
        }
      } catch (err) {
        console.error('Failed to fetch shift times:', err);
        // Do not hard-code any fallback times; rely on Config page values only
        setShiftTimes([]);
      }
    };
    fetchShiftTimes();
  }, []);

  // Calculate next shift change time
  const getNextShiftChangeTime = () => {
    if (!shiftTimes || shiftTimes.length === 0) {
      return null;
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert to HHMM format
    
    // Convert shift times to HHMM format and sort them
    const sortedShiftTimes = shiftTimes
      .map(time => {
        // Support both HH:MM and HHMM formats from backend/config
        if (time.length === 4 && !time.includes(':')) {
          return parseInt(time);
        } else if (time.includes(':')) {
          const [hours, minutes] = time.split(':');
          return parseInt(hours) * 100 + parseInt(minutes);
        }
        return parseInt(time);
      })
      .sort((a, b) => a - b);

    // Find the next shift time
    let nextShiftTime = null;
    let isToday = false;
    for (const shiftTime of sortedShiftTimes) {
      if (shiftTime > currentTime) {
        nextShiftTime = shiftTime;
        isToday = true;
        break;
      }
    }

    // If no shift time is found for today, use the first shift time of tomorrow
    if (!nextShiftTime) {
      nextShiftTime = sortedShiftTimes[0];
      isToday = false;
    }

    // Convert back to Date object
    const hours = Math.floor(nextShiftTime / 100);
    const minutes = nextShiftTime % 100;
    const nextShiftDate = new Date(now);
    nextShiftDate.setHours(hours, minutes, 0, 0);

    // If the next shift is tomorrow, add a day
    if (!isToday) {
      nextShiftDate.setDate(nextShiftDate.getDate() + 1);
    }

    return nextShiftDate;
  };

  // Calculate shift end time based on next shift change
  useEffect(() => {
    const nextShiftChangeTime = getNextShiftChangeTime();
    
    if (nextShiftChangeTime) {
      setShiftEndTime(nextShiftChangeTime);
      console.log('🕐 Shift countdown timer initialized:', {
        shiftName: currentShift?.name,
        nextShiftChangeTime: nextShiftChangeTime.toISOString(),
        shiftTimes
      });
    } else {
      setShiftEndTime(null);
      console.log('🕐 No shift times available');
    }
  }, [shiftTimes, currentShift]);

  // Update countdown every second
  useEffect(() => {
    if (!shiftEndTime) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const timeDiff = shiftEndTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        // Keep rendering with zero instead of disappearing
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
        setIsNearEnd(true);
        console.log('⏰ Shift change time reached - countdown reached zero');
        return;
      }

      const totalSeconds = Math.floor(timeDiff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      setTimeRemaining({ hours, minutes, seconds, totalSeconds });
      
      // Mark as near end if less than 30 minutes remaining
      const isNear = totalSeconds <= 1800; // 30 minutes
      if (isNear !== isNearEnd) {
        setIsNearEnd(isNear);
        if (isNear) {
          console.log('⚠️ Shift change soon - less than 30 minutes remaining');
        }
      }
    };

    // Initial update
    updateCountdown();
    
    // Set up interval
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [shiftEndTime, isNearEnd]);

  // Don't render if no shift times or time remaining
  if (!shiftTimes.length || timeRemaining == null) {
    console.log('🕐 ShiftCountdownTimer not rendering:', { 
      hasShiftTimes: shiftTimes.length > 0, 
      hasTimeRemaining: timeRemaining != null
    });
    return null;
  }

  const formatTime = (time) => {
    if (time.totalSeconds <= 0) {
      return 'Shift Change';
    }
    
    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
    } else if (time.minutes > 0) {
      return `${time.minutes}m ${time.seconds}s`;
    } else {
      return `${time.seconds}s`;
    }
  };

  const getChipColor = () => {
    if (timeRemaining.totalSeconds <= 0) {
      return 'error';
    } else if (isNearEnd) {
      return 'warning';
    } else {
      return 'info';
    }
  };

  const getTooltipText = () => {
    if (timeRemaining.totalSeconds <= 0) {
      return 'Shift change time reached';
    }
    
    const endTimeStr = shiftEndTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    return `Next shift change at ${endTimeStr}`;
  };

  return (
    <Tooltip title={getTooltipText()} arrow>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={timeRemaining.totalSeconds <= 0 || isNearEnd ? <WarningIcon /> : <TimeIcon />}
          label={formatTime(timeRemaining)}
          size="small"
          color={getChipColor()}
          variant="outlined"
          sx={{
            minWidth: '120px',
            fontFamily: 'monospace',
            fontWeight: 600,
            '& .MuiChip-label': {
              minWidth: '80px',
              textAlign: 'center'
            },
            ...(timeRemaining.totalSeconds <= 0 && {
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 }
              }
            }),
            ...(isNearEnd && timeRemaining.totalSeconds > 0 && {
              animation: 'blink 1s infinite',
              '@keyframes blink': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.7 },
                '100%': { opacity: 1 }
              }
            })
          }}
        />
      </Box>
    </Tooltip>
  );
};

export default ShiftCountdownTimer;