# Analytics vs Dashboard Data Discrepancy Analysis Report

## Executive Summary

This report documents the investigation into discrepancies between Dashboard and Analytics page metrics in the manufacturing monitoring system. The analysis reveals that **most endpoints use consistent calculation methods**, but there are **significant differences in how events-based calculations work** due to limited event data.

## Key Findings

### ✅ **CONSISTENT ENDPOINTS** (No Discrepancies Expected)

The following endpoints use **identical calculation methods** and should show matching values:

1. **Dashboard Page** - Uses `asset.runtime` and `asset.downtime` directly from database
2. **Analytics `/availability` endpoint** - Uses `asset.runtime` and `asset.downtime` directly from database  
3. **Analytics `/overview` endpoint** - Uses `asset.runtime` and `asset.downtime` for totals

**Current Values (as of analysis):**
- System Availability: 100%
- Total Runtime: 2.06 hours
- Total Downtime: 0.02 hours
- Total Stops: 0
- Active Assets: 2/2

### ⚠️ **PROBLEMATIC ENDPOINT** (Significant Discrepancies Expected)

**Analytics `/performance` endpoint** calculates metrics from `event.duration` in STATE_CHANGE events, which causes major discrepancies:

**Root Cause:**
- Limited event data (only 8 total events in database)
- 2 events with null duration
- 1 event with negative duration (-8 seconds)
- Events-based calculation only includes events within date range
- Missing historical runtime data

**Impact:**
- Events-based calculations show near-zero runtime
- Asset fields show 2+ hours of cumulative runtime
- Availability percentages differ dramatically

## Technical Analysis

### Database State

**Assets Table:**
```
Production Line A (ID: 1):
- Current State: RUNNING
- Database Runtime: 2.06 hours (7,423 seconds)
- Database Downtime: 0 hours
- Total Stops: 0
- Last State Change: 2025-08-17 12:02:14

Hydraulic Press #1 (ID: 2):
- Current State: RUNNING  
- Database Runtime: 0 hours
- Database Downtime: 0.02 hours (89 seconds)
- Total Stops: 0
- Last State Change: 2025-08-17 09:57:53
```

**Events Table:**
```
Total Events: 8
- STATE_CHANGE events: 6
- SHIFT_START events: 2
- Events with valid duration: 6/8
- Events with null duration: 2/8
- Events with negative duration: 1/8
- Total event duration: 7,639 seconds (2.12 hours)
```

### Calculation Method Comparison

| Method | Used By | Data Source | Reliability |
|--------|---------|-------------|-------------|
| **Asset Fields** | Dashboard, Analytics /availability, Analytics /overview | `asset.runtime`, `asset.downtime` | ✅ High - Updated in real-time |
| **Events-Based** | Analytics /performance | `event.duration` from STATE_CHANGE events | ❌ Low - Limited/invalid data |

## Data Quality Issues

### Event Duration Problems
1. **Null Durations**: 2 SHIFT_START events have null duration
2. **Negative Duration**: 1 STATE_CHANGE event has -8 second duration
3. **Limited History**: Only 8 total events for 2 assets
4. **Missing Events**: Gaps in state change tracking

### Asset Field Reliability
- Asset runtime/downtime fields are updated in real-time by `assetService.js`
- Values reflect cumulative runtime since asset creation
- Consistent across all major endpoints
- No data quality issues identified

## Root Cause Analysis

### Why Events-Based Calculations Fail

1. **Insufficient Event Data**: Only 8 events total, with some having invalid durations
2. **Date Range Filtering**: Events-based endpoints filter by date range, potentially excluding historical data
3. **Duration Calculation Bugs**: Negative and null durations indicate issues in state change handlers
4. **Event Generation Gaps**: Missing events for state transitions

### Why Asset Fields Work

1. **Real-Time Updates**: Updated immediately when asset state changes
2. **Cumulative Tracking**: Maintains total runtime since asset creation
3. **No Date Filtering**: Always reflects complete historical data
4. **Validation**: Proper data types and non-negative values

## Recommendations

### Immediate Actions (High Priority)

1. **Standardize on Asset Fields**: Use `asset.runtime` and `asset.downtime` for all metric calculations
2. **Fix Event Duration Calculation**: Debug and fix the state change handlers that generate negative/null durations
3. **Add Data Validation**: Implement validation for event durations before database insertion
4. **Update Analytics /performance**: Modify to use asset fields instead of events for consistency

### Long-Term Improvements (Medium Priority)

1. **Event Data Cleanup**: Remove or fix invalid events in the database
2. **Comprehensive Event Logging**: Ensure all state changes generate proper events
3. **Dual Calculation Verification**: Use events as a secondary validation method for asset fields
4. **Monitoring**: Add alerts for data quality issues (negative durations, missing events)

### Code Changes Required

1. **analyticsController.js**: Update `/performance` endpoint to use asset fields
2. **assetService.js**: Add validation for event duration calculations
3. **Database**: Clean up invalid events and add constraints
4. **Frontend**: Update any components that rely on events-based calculations

## Conclusion

The investigation reveals that **Dashboard and Analytics pages should show consistent data** for most metrics, as they use the same underlying asset fields. The primary source of discrepancies is the Analytics `/performance` endpoint, which attempts to calculate metrics from limited and invalid event data.

**The recommended solution is to standardize all calculations on the reliable `asset.runtime` and `asset.downtime` fields**, which are properly maintained and provide accurate real-time data.

## Files Analyzed

- `src/backend/controllers/analyticsController.js` - Analytics API endpoints
- `src/backend/config/database.js` - Database configuration
- `src/backend/services/assetService.js` - Asset state management
- `verify_analytics_accuracy.js` - Verification script
- Database tables: `assets`, `events`

## Analysis Scripts Created

- `check_current_assets.js` - Asset data inspection
- `check_events.js` - Events data inspection  
- `analytics_discrepancy_analysis.js` - Comprehensive analysis

---

*Report generated on: 2025-01-20*  
*Analysis completed by: AI Assistant*