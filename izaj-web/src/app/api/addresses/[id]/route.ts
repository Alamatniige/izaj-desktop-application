import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// PUT /api/addresses/[id] - Update address
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user from Supabase session (cookies)
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, address, is_default } = body;

    // Validate required fields
    if (!name || !phone || !address) {
      return NextResponse.json({ 
        error: 'Name, phone, and address are required' 
      }, { status: 400 });
    }

    // Update address
    const { data: updatedAddress, error } = await supabase
      .from('user_addresses')
      .update({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        is_default: is_default,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select()
      .single();

    if (error) {
      console.error('Error updating address:', error);
      return NextResponse.json({ 
        error: 'Failed to update address',
        details: error.message 
      }, { status: 500 });
    }

    if (!updatedAddress) {
      return NextResponse.json({ 
        error: 'Address not found or access denied' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      address: updatedAddress 
    });

  } catch (error) {
    console.error('Error in PUT /api/addresses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/addresses/[id] - Delete address (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user from Supabase session (cookies)
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Soft delete address (set is_active to false)
    const { data: deletedAddress, error } = await supabase
      .from('user_addresses')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select()
      .single();

    if (error) {
      console.error('Error deleting address:', error);
      return NextResponse.json({ 
        error: 'Failed to delete address',
        details: error.message 
      }, { status: 500 });
    }

    if (!deletedAddress) {
      return NextResponse.json({ 
        error: 'Address not found or access denied' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Address deleted successfully' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/addresses/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
