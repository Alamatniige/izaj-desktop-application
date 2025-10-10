import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing deletion token' }, { status: 400 });
    }

    // Find user with this deletion token
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({ error: 'Failed to verify token' }, { status: 500 });
    }

    const user = users?.find(u => 
      u.user_metadata?.deletionToken === token &&
      u.user_metadata?.deletionTokenExpiry
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired deletion token' }, { status: 400 });
    }

    // Check if token is expired
    const tokenExpiry = new Date(user.user_metadata.deletionTokenExpiry);
    if (tokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Deletion link has expired' }, { status: 400 });
    }

    // Delete user's data from related tables
    try {
      // Delete user addresses
      await supabaseAdmin
        .from('user_addresses')
        .delete()
        .eq('user_id', user.id);

      // Delete user e-wallets
      await supabaseAdmin
        .from('user_ewallets')
        .delete()
        .eq('user_id', user.id);

      // Delete user profile
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user.id);

      // You can add more tables here as needed
      // For example: orders, favorites, etc.

    } catch (dataError) {
      console.error('Error deleting user data:', dataError);
      // Continue with auth deletion even if some data deletion fails
    }

    // Delete user from authentication
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    // Create a response that clears the session cookies
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const redirectUrl = new URL('/auth/deletion-success', baseUrl);
    
    const response = NextResponse.redirect(redirectUrl);
    
    // Clear all auth-related cookies
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    response.cookies.delete('supabase-auth-token');
    response.cookies.delete('supabase.auth.token');
    
    // Clear any other potential auth cookies
    const cookieNames = [
      'sb-localhost-auth-token',
      'sb-127.0.0.1-auth-token',
      'supabase-auth-token',
      'supabase.auth.token',
      'sb-access-token',
      'sb-refresh-token'
    ];
    
    cookieNames.forEach(cookieName => {
      response.cookies.delete(cookieName);
    });
    
    return response;

  } catch (error) {
    console.error('Error in confirm-deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

