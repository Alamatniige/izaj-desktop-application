import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// PUT /api/ewallets/[id] - Update e-wallet
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
    const { type, account_name, account_number, icon, color } = body;

    // Validate required fields
    if (!type || !account_name || !account_number) {
      return NextResponse.json({ 
        error: 'Type, account name, and account number are required' 
      }, { status: 400 });
    }

    // Update e-wallet
    const { data: updatedEwallet, error } = await supabase
      .from('user_ewallets')
      .update({
        type: type.trim(),
        account_name: account_name.trim(),
        account_number: account_number.trim(),
        icon: icon || 'mdi:wallet',
        color: color || 'bg-gray-500',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select()
      .single();

    if (error) {
      console.error('Error updating e-wallet:', error);
      return NextResponse.json({ 
        error: 'Failed to update e-wallet',
        details: error.message 
      }, { status: 500 });
    }

    if (!updatedEwallet) {
      return NextResponse.json({ 
        error: 'E-wallet not found or access denied' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      ewallet: updatedEwallet 
    });

  } catch (error) {
    console.error('Error in PUT /api/ewallets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ewallets/[id] - Delete e-wallet (soft delete)
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

    // Soft delete e-wallet (set is_active to false)
    const { data: deletedEwallet, error } = await supabase
      .from('user_ewallets')
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
      console.error('Error deleting e-wallet:', error);
      return NextResponse.json({ 
        error: 'Failed to delete e-wallet',
        details: error.message 
      }, { status: 500 });
    }

    if (!deletedEwallet) {
      return NextResponse.json({ 
        error: 'E-wallet not found or access denied' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'E-wallet deleted successfully' 
    });

  } catch (error) {
    console.error('Error in DELETE /api/ewallets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
