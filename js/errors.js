'use strict';

window.AppErrors = {
    // Storage errors
    STORAGE: {
        INVALID_DATE: 'STORAGE_INVALID_DATE',
        ENTRY_NOT_FOUND: 'STORAGE_ENTRY_NOT_FOUND',
        QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
        PARSE_ERROR: 'STORAGE_PARSE_ERROR'
    },
    
    // Sync errors
    SYNC: {
        NOT_AUTHENTICATED: 'SYNC_NOT_AUTHENTICATED',
        NETWORK_ERROR: 'SYNC_NETWORK_ERROR',
        CONFLICT: 'SYNC_CONFLICT'
    },
    
    // Auth errors
    AUTH: {
        INVALID_EMAIL: 'AUTH_INVALID_EMAIL',
        SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED'
    }
};
