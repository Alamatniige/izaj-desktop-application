import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/addresses - Get all addresses for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase session (cookies)
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get addresses for the user
    const { data: addresses, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching addresses:', error);
      return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      addresses: addresses || [] 
    });

  } catch (error) {
    console.error('Error in GET /api/addresses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/addresses - Create new address
export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase session (cookies)
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address, is_default = false } = body;

    // Validate required fields
    if (!name || !phone || !address) {
      return NextResponse.json({ 
        error: 'Name, phone, and address are required' 
      }, { status: 400 });
    }

    // Create new address
    const { data: newAddress, error } = await supabase
      .from('user_addresses')
      .insert([{
        user_id: user.id,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        is_default: is_default
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating address:', error);
      return NextResponse.json({ 
        error: 'Failed to create address',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      address: newAddress 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/addresses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
