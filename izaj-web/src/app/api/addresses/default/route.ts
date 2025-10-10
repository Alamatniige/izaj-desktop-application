import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/addresses/default - Get default address
export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase session (cookies)
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get default address using the function
    const { data: defaultAddress, error } = await supabase
      .rpc('get_default_address', { user_id_param: user.id });

    if (error) {
      console.error('Error fetching default address:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch default address',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      address: defaultAddress?.[0] || null 
    });

  } catch (error) {
    console.error('Error in GET /api/addresses/default:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/addresses/default - Set address as default
export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase session (cookies)
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { address_id } = body;

    if (!address_id) {
      return NextResponse.json({ 
        error: 'Address ID is required' 
      }, { status: 400 });
    }

    // Set address as default using the function
    const { data: updatedAddress, error } = await supabase
      .rpc('set_default_address', { 
        address_id: address_id,
        user_id_param: user.id 
      });

    if (error) {
      console.error('Error setting default address:', error);
      return NextResponse.json({ 
        error: 'Failed to set default address',
        details: error.message 
      }, { status: 500 });
    }

    if (!updatedAddress || updatedAddress.length === 0) {
      return NextResponse.json({ 
        error: 'Address not found or access denied' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      address: updatedAddress[0] 
    });

  } catch (error) {
    console.error('Error in POST /api/addresses/default:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
