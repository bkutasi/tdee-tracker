#!/bin/bash
# Build script for Cloudflare Pages deployment
# Generates js/config.js from environment variables

set -e

echo "🔧 Building TDEE Tracker..."

# Check for required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Warning: Supabase credentials not set"
    echo "   Auth features will be disabled"
    echo "   Set SUPABASE_URL and SUPABASE_ANON_KEY in Cloudflare Pages settings"
    
    # Create minimal config without credentials
    cat > js/config.js << 'EOF'
'use strict';
window.SUPABASE_CONFIG = null;
console.warn('[Config] Supabase credentials not set. Auth disabled.');
EOF
else
    echo "✅ Supabase credentials found"
    
    # Generate config.js from environment variables
    cat > js/config.js << EOF
'use strict';
window.SUPABASE_CONFIG = {
    url: '$SUPABASE_URL',
    anonKey: '$SUPABASE_ANON_KEY'
};
console.log('[Config] Supabase configured');
EOF
    
    echo "✅ Config generated successfully"
fi

echo "✅ Build complete!"
