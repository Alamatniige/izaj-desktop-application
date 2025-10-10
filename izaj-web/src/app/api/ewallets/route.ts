import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/ewallets - Get all e-wallets for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase session (cookies)
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get e-wallets for the user
    const { data: ewallets, error } = await supabase
      .from('user_ewallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching e-wallets:', error);
      return NextResponse.json({ error: 'Failed to fetch e-wallets' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      ewallets: ewallets || [] 
    });

  } catch (error) {
    console.error('Error in GET /api/ewallets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ewallets - Create new e-wallet
export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase session (cookies)
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, account_name, account_number, icon, color } = body;

    // Validate required fields
    if (!type || !account_name || !account_number) {
      return NextResponse.json({ 
        error: 'Type, account name, and account number are required' 
      }, { status: 400 });
    }

    // Create new e-wallet
    const { data: newEwallet, error } = await supabase
      .from('user_ewallets')
      .insert([{
        user_id: user.id,
        type: type.trim(),
        account_name: account_name.trim(),
        account_number: account_number.trim(),
        icon: icon || 'mdi:wallet',
        color: color || 'bg-gray-500'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating e-wallet:', error);
      return NextResponse.json({ 
        error: 'Failed to create e-wallet',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      ewallet: newEwallet 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/ewallets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
