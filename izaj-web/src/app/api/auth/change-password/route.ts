import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ChangePasswordBody = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

// Password strength validation
function validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ChangePasswordBody;
        const { currentPassword, newPassword, confirmPassword } = body;
        
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
        
        // Validate password strength
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return NextResponse.json({ 
                error: 'Password does not meet requirements',
                details: passwordValidation.errors
            }, { status: 400 });
        }
        
        // Get the current user session
        const supabase = await getSupabaseServerClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            return NextResponse.json({ 
                error: 'User not authenticated' 
            }, { status: 401 });
        }
        
        // Verify current password by attempting to sign in
        try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
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
            
            // Sign out the test session to avoid conflicts
            await supabase.auth.signOut();
        } catch (verifyError) {
            console.error('Password verification error:', verifyError);
            return NextResponse.json({ 
                error: 'Failed to verify current password' 
            }, { status: 400 });
        }
        
        // Update the password using the admin client
        console.log('Updating password for user:', user.id);
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: newPassword
        });
        
        if (updateError) {
            console.error('Password update error:', updateError);
            return NextResponse.json({ 
                error: 'Failed to update password' 
            }, { status: 500 });
        }
        
        console.log('Password updated successfully for user:', user.id);
        
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
        } catch (logError) {
            console.log('Audit logging not available (table may not exist):', logError);
            // Don't fail the request if logging fails - this is optional
        }
        
        return NextResponse.json({ 
            success: true,
            message: 'Password has been changed successfully' 
        }, { status: 200 });
        
    } catch (err) {
        console.error('Change password error:', err);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}
