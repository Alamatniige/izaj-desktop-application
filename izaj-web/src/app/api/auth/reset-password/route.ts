import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ResetPasswordBody = {
    token: string;
    password: string;
    confirmPassword: string;
};

type VerifyTokenBody = {
    token: string;
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

// Verify reset token
export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ResetPasswordBody;
        const { token, password, confirmPassword } = body;
        
        // Validate required fields
        if (!token || !password || !confirmPassword) {
            return NextResponse.json({ 
                error: 'Token, password, and confirm password are required' 
            }, { status: 400 });
        }
        
        // Validate password match
        if (password !== confirmPassword) {
            return NextResponse.json({ 
                error: 'Passwords do not match' 
            }, { status: 400 });
        }
        
        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return NextResponse.json({ 
                error: 'Password does not meet requirements',
                details: passwordValidation.errors
            }, { status: 400 });
        }
        
        // Verify the reset token and update password
        const supabase = await getSupabaseServerClient();
        
        // Try different token verification methods
        let user = null;
        let session = null;
        
        // Method 1: Try verifyOtp with recovery type
        try {
            const otpResult = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'recovery'
            });
            
            if (!otpResult.error && otpResult.data.user) {
                user = otpResult.data.user;
                session = otpResult.data.session;
                console.log('Token verified via verifyOtp');
            }
        } catch (otpError) {
            console.log('verifyOtp failed, trying exchangeCodeForSession');
        }
        
        // Method 2: Try exchangeCodeForSession if verifyOtp failed
        if (!user) {
            try {
                const exchangeResult = await supabase.auth.exchangeCodeForSession(token);
                
                if (!exchangeResult.error && exchangeResult.data.user) {
                    user = exchangeResult.data.user;
                    session = exchangeResult.data.session;
                    console.log('Token verified via exchangeCodeForSession');
                }
            } catch (exchangeError) {
                console.log('exchangeCodeForSession failed');
            }
        }
        
        // Method 3: Try using the admin client to verify token
        if (!user) {
            try {
                // Use admin client to verify the token
                const { data: adminData, error: adminError } = await supabaseAdmin.auth.verifyOtp({
                    token_hash: token,
                    type: 'recovery'
                });
                
                if (!adminError && adminData.user) {
                    user = adminData.user;
                    console.log('Token verified via admin verifyOtp');
                }
            } catch (adminError) {
                console.log('Admin verifyOtp failed');
            }
        }
        
        if (!user) {
            console.error('All token verification methods failed');
            return NextResponse.json({ 
                error: 'Invalid or expired reset token' 
            }, { status: 400 });
        }
        
        // Now update the password using the admin client
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: password
        });
        
        if (updateError) {
            console.error('Password update error:', updateError);
            return NextResponse.json({ 
                error: 'Failed to update password' 
            }, { status: 500 });
        }
        
        // Log successful password reset
        try {
            await supabaseAdmin
                .from('audit_logs')
                .insert({
                    user_id: user.id,
                    action: 'password_reset',
                    details: { method: 'email_reset' },
                    ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                    user_agent: request.headers.get('user-agent') || 'unknown'
                });
        } catch (logError) {
            console.error('Failed to log password reset:', logError);
            // Don't fail the request if logging fails
        }
        
        return NextResponse.json({ 
            success: true,
            message: 'Password has been reset successfully' 
        }, { status: 200 });
        
    } catch (err) {
        console.error('Reset password error:', err);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}

// Verify token validity without changing password
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        
        if (!token) {
            return NextResponse.json({ 
                error: 'Token is required' 
            }, { status: 400 });
        }
        
        // Verify token without consuming it
        const supabase = await getSupabaseServerClient();
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
        });
        
        if (error || !data.user) {
            return NextResponse.json({ 
                error: 'Invalid or expired reset token' 
            }, { status: 400 });
        }
        
        return NextResponse.json({ 
            success: true,
            message: 'Token is valid',
            user_id: data.user.id
        }, { status: 200 });
        
    } catch (err) {
        console.error('Token verification error:', err);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}
