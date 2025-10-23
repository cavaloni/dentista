#!/bin/bash
set -e

echo "======================================"
echo "Booking Notifications Migration Setup"
echo "======================================"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI not found."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "Step 1: Checking Supabase connection..."
echo ""

# Try to check status
if supabase status &> /dev/null; then
    echo "✓ Local Supabase is running"
    echo ""
    echo "Step 2: Applying migration..."
    npx supabase db reset
    echo ""
    echo "Step 3: Generating TypeScript types..."
    npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
    echo "✓ Types generated successfully"
else
    echo "⚠ Local Supabase is not running"
    echo ""
    echo "Choose an option:"
    echo "1. Start local Supabase and apply migration (recommended for development)"
    echo "2. Apply migration to remote Supabase (production)"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1)
            echo ""
            echo "Starting local Supabase..."
            npx supabase start
            echo ""
            echo "Migration applied automatically during start."
            echo ""
            echo "Generating TypeScript types..."
            npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
            echo "✓ Types generated successfully"
            ;;
        2)
            echo ""
            echo "Applying migration to remote Supabase..."
            npx supabase db push
            echo ""
            echo "Generating TypeScript types from remote..."
            npx supabase gen types typescript > src/lib/supabase/database.types.ts
            echo "✓ Types generated successfully"
            ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Test booking notifications"
echo "3. Check browser console for [useBookingListener] logs"
echo ""
echo "Documentation: See REALTIME_NOTIFICATIONS.md for details"
