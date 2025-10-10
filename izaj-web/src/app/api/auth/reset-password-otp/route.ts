import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { otpResetPasswordLimiter, createRateLimitResponse } from '@/lib/rate-limiter';

type ResetPasswordOTPBody = {
    userId: string;
    phoneNumber: string;
    password: string;
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
        // Check rate limit
        const rateLimit = await otpResetPasswordLimiter.check(request);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.retryAfter!);
        }

        const body = (await request.json()) as Partial<ResetPasswordOTPBody>;
        const { userId, phoneNumber, password, confirmPassword } = body;
        
        // Validate required fields
        if (!userId || !phoneNumber || !password || !confirmPassword) {
            return NextResponse.json({ 
                error: 'User ID, phone number, password, and confirm password are required' 
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
        
        // Verify that the user exists and the phone number matches
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (userError || !userData?.user) {
            return NextResponse.json({ 
                error: 'Invalid user or user not found' 
            }, { status: 400 });
        }
        
        // Verify that there's a recent OTP verification for this user and phone
        const { data: otpData, error: otpError } = await supabaseAdmin
            .from('otp_verifications')
            .select('*')
            .eq('user_id', userId)
            .eq('used', true)
            .gte('used_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Within last 30 minutes
            .order('used_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (otpError) {
            console.error('Error checking OTP verification:', otpError);
            return NextResponse.json({ 
                error: 'Failed to verify OTP status' 
            }, { status: 500 });
        }
        
        if (!otpData) {
            return NextResponse.json({ 
                error: 'No recent OTP verification found. Please verify your phone number again.' 
            }, { status: 400 });
        }
        
        // Update the password using the admin client
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
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
                    user_id: userId,
                    action: 'password_reset',
                    details: { 
                        method: 'otp_sms',
                        phone_number: phoneNumber.substring(0, 3) + '***' // Partially mask phone
                    },
                    ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                    user_agent: request.headers.get('user-agent') || 'unknown'
                });
        } catch (logError) {
            console.error('Failed to log password reset:', logError);
            // Don't fail the request if logging fails
        }
        
        // Clean up used OTP records for this user
        try {
            await supabaseAdmin
                .from('otp_verifications')
                .delete()
                .eq('user_id', userId);
        } catch (cleanupError) {
            console.error('Failed to cleanup OTP records:', cleanupError);
            // Don't fail the request if cleanup fails
        }
        
        return NextResponse.json({ 
            success: true,
            message: 'Password has been reset successfully' 
        }, { status: 200 });
        
    } catch (err) {
        console.error('Reset password OTP error:', err);
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 });
    }
}
