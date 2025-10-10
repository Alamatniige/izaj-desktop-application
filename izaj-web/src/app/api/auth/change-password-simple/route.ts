import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ChangePasswordBody = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ChangePasswordBody;
        const { currentPassword, newPassword, confirmPassword } = body;
        
        console.log('Change password request received');
        
        // Validate required fields
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json({ 
                error: 'Current password, new password, and confirm password are required' 
            }, { status: 400 });
        }
        
        // Validate password match
        if (newPassword !== confirmPassword) {
            return NextResponse.json({ 
                error: 'New passwords do not match' 
            }, { status: 400 });
        }
        
        // Validate that new password is different from current password
        if (currentPassword === newPassword) {
            return NextResponse.json({ 
                error: 'New password must be different from current password' 
            }, { status: 400 });
        }
        
        // Get the current user session
        const supabase = await getSupabaseServerClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.log('User not authenticated:', userError?.message);
            return NextResponse.json({ 
                error: 'User not authenticated' 
            }, { status: 401 });
        }
        
        console.log('User authenticated:', user.id, user.email);
        
        // Verify current password by attempting to sign in with a temporary client
        console.log('Verifying current password...');
        const tempSupabase = await getSupabaseServerClient();
        const { data: signInData, error: signInError } = await tempSupabase.auth.signInWithPassword({
            email: user.email!,
            password: currentPassword
        });
        
        if (signInError || !signInData.user) {
            console.log('Current password verification failed:', signInError?.message);
            return NextResponse.json({ 
                error: 'Current password is incorrect' 
            }, { status: 400 });
        }
        
        console.log('Current password verified successfully');
        
        // Sign out the temporary session to avoid conflicts
        await tempSupabase.auth.signOut();
        
        // Update the password using the admin client
        console.log('Updating password using admin client...');
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: newPassword
        });
        
        if (updateError) {
            console.error('Password update error:', updateError);
            return NextResponse.json({ 
                error: 'Failed to update password: ' + updateError.message
            }, { status: 500 });
        }
        
        console.log('Password updated successfully');
        
        // Log successful password change (optional - won't fail if table doesn't exist)
        try {
            await supabaseAdmin
                .from('audit_logs')
                .insert({
                    user_id: user.id,
                    action: 'password_change',
                    details: { method: 'authenticated_change' },
                    ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                    user_agent: request.headers.get('user-agent') || 'unknown'
                });
            console.log('Password change logged to audit_logs');
        } catch (logError) {
            console.log('Audit logging not available (table may not exist):', logError);
            // Don't fail the request if logging fails - this is optional
        }
        
        return NextResponse.json({ 
            success: true,
            message: 'Password has been changed successfully and verified'
        }, { status: 200 });
        
    } catch (err) {
        console.error('Change password error:', err);
        return NextResponse.json({ 
            error: 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error')
        }, { status: 500 });
    }
}
