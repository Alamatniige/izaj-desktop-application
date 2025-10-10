import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { forgotPasswordLimiter, createRateLimitResponse } from '@/lib/rate-limiter';
import { emailService } from '@/lib/email-service';
import { randomBytes } from 'crypto';

type ForgotPasswordBody = {
    identifier: string; // email or phone
};

export async function POST(request: Request) {
    try {
        // Check rate limit
        const rateLimit = await forgotPasswordLimiter.check(request);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.retryAfter!);
        }

        const body = (await request.json()) as Partial<ForgotPasswordBody>;
        const identifier = (body?.identifier || '').toString().trim();
        
        if (!identifier) {
            return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 });
        }

        const isProbablyPhone = /^\+?\d{10,15}$/.test(identifier.replace(/[^\d+]/g, ''));

        let userEmail = '';
        
        if (isProbablyPhone) {
            // Handle phone number lookup
            const digits = identifier.replace(/\D/g, '');
            const candidates: string[] = [];
            
            if (digits) {
                // Derive a stable local 10-digit mobile number if possible
                let local10 = digits;
                if (digits.startsWith('63') && digits.length >= 12) {
                    local10 = digits.slice(-10);
                } else if (digits.startsWith('0') && digits.length >= 11) {
                    local10 = digits.slice(-10);
                } else if (digits.length >= 10) {
                    local10 = digits.slice(-10);
                }

                const local0 = `0${local10}`;
                const cc63 = `63${local10}`;
                const plus63 = `+63${local10}`;

                candidates.push(
                    digits,
                    local10,
                    local0,
                    cc63,
                    plus63,
                );
            }

            // Try to find profile by any candidate value
            let profile: { id: string } | null = null;
            for (const cand of Array.from(new Set(candidates))) {
                const { data, error } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('phone', cand)
                    .maybeSingle();
                if (!error && data?.id) { 
                    profile = data; 
                    break; 
                }
            }

            if (profile?.id) {
                // Fetch the auth user to get their email
                const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(profile.id);
                userEmail = userResp?.user?.email || '';
            } else {
                // Fallback: scan auth users for matching metadata.phone
                try {
                    const uniqueCands = new Set(candidates);
                    const raw = identifier.replace(/\D/g, '');
                    let targetLocal10 = raw;
                    if (raw.startsWith('63') && raw.length >= 12) targetLocal10 = raw.slice(-10);
                    else if (raw.startsWith('0') && raw.length >= 11) targetLocal10 = raw.slice(-10);
                    else if (raw.length >= 10) targetLocal10 = raw.slice(-10);

                    let page = 1;
                    const perPage = 100;
                    let found: string | null = null;
                    
                    while (!found && page <= 10) {
                        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
                        const users = list?.users || [];
                        for (const u of users) {
                            const m = (u as any)?.user_metadata || {};
                            const metaPhone = (m.phone || '').toString();
                            const metaDigits = metaPhone.replace(/\D/g, '');
                            let metaLocal10 = metaDigits;
                            if (metaDigits.startsWith('63') && metaDigits.length >= 12) metaLocal10 = metaDigits.slice(-10);
                            else if (metaDigits.startsWith('0') && metaDigits.length >= 11) metaLocal10 = metaDigits.slice(-10);
                            else if (metaDigits.length >= 10) metaLocal10 = metaDigits.slice(-10);

                            if (
                                (metaPhone && uniqueCands.has(metaPhone)) ||
                                (metaDigits && uniqueCands.has(metaDigits)) ||
                                (metaLocal10 && metaLocal10 === targetLocal10)
                            ) {
                                found = u.email || null;
                                break;
                            }
                        }
                        if (found) break;
                        if (!list || users.length < perPage) break;
                        page += 1;
                    }
                    if (found) userEmail = found;
                } catch {}
            }

            if (!userEmail) {
                // Don't reveal if user exists or not for security
                return NextResponse.json({ 
                    message: 'If an account with that email or phone exists, we\'ve sent a password reset link.' 
                }, { status: 200 });
            }
        } else {
            userEmail = identifier; // treat as email
        }

        // Generate password reset token
        const resetToken = randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Find the user and update their metadata with reset token
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
            console.error('Error listing users:', listError);
            // Don't reveal the error for security reasons
        } else {
            const user = users.users.find(u => u.email === userEmail);
            
            if (user) {
                // Update user metadata with reset token
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    user.id,
                    {
                        user_metadata: {
                            ...user.user_metadata,
                            resetToken,
                            resetTokenExpiry: tokenExpiry.toISOString(),
                        }
                    }
                );

                if (!updateError) {
                    // Send password reset email via Gmail
                    try {
                        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/reset-password?token=${resetToken}`;
                        
                        const html = `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="utf-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Password Reset - IZAJ Trading</title>
                                <style>
                                    body {
                                        font-family: Arial, sans-serif;
                                        line-height: 1.6;
                                        color: #333;
                                        max-width: 600px;
                                        margin: 0 auto;
                                        padding: 20px;
                                    }
                                    .header {
                                        background-color: #000;
                                        color: white;
                                        padding: 20px;
                                        text-align: center;
                                        border-radius: 8px 8px 0 0;
                                    }
                                    .content {
                                        background-color: #f9f9f9;
                                        padding: 30px;
                                        border-radius: 0 0 8px 8px;
                                    }
                                    .button {
                                        display: inline-block;
                                        background-color: #000;
                                        color: white;
                                        padding: 12px 30px;
                                        text-decoration: none;
                                        border-radius: 5px;
                                        margin: 20px 0;
                                        font-weight: bold;
                                    }
                                    .button:hover {
                                        background-color: #333;
                                    }
                                    .footer {
                                        text-align: center;
                                        margin-top: 30px;
                                        font-size: 12px;
                                        color: #666;
                                    }
                                    .warning {
                                        background-color: #fff3cd;
                                        border: 1px solid #ffeaa7;
                                        color: #856404;
                                        padding: 15px;
                                        border-radius: 5px;
                                        margin: 20px 0;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="header">
                                    <h1>IZAJ Trading</h1>
                                    <p>Password Reset Request</p>
                                </div>
                                <div class="content">
                                    <h2>Password Reset Request</h2>
                                    <p>We received a request to reset your password for your IZAJ Trading account.</p>
                                    
                                    <div style="text-align: center;">
                                        <a href="${resetUrl}" class="button">Reset Password</a>
                                    </div>
                                    
                                    <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                                    <p style="word-break: break-all; background-color: #e9e9e9; padding: 10px; border-radius: 4px;">
                                        ${resetUrl}
                                    </p>
                                    
                                    <div class="warning">
                                        <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email.
                                    </div>
                                    
                                    <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                                    
                                    <p>Best regards,<br>The IZAJ Trading Team</p>
                                </div>
                                <div class="footer">
                                    <p>© 2024 IZAJ Trading. All rights reserved.</p>
                                    <p>For support, contact us at izajtrading@gmail.com</p>
                                </div>
                            </body>
                            </html>
                        `;

                        const text = `
                            Password Reset Request
                            
                            We received a request to reset your password for your IZAJ Trading account.
                            
                            To reset your password, please visit this link:
                            ${resetUrl}
                            
                            This link will expire in 1 hour for security reasons.
                            
                            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                            
                            Best regards,
                            The IZAJ Trading Team
                        `;

                        await emailService.sendEmail({
                            to: userEmail,
                            subject: 'Password Reset Request - IZAJ Trading',
                            html,
                            text,
                        });
                    } catch (emailError) {
                        console.error('Error sending password reset email:', emailError);
                        // Don't reveal the error for security reasons
                    }
                }
            }
        }

        // Log the forgot password attempt
        try {
            await supabaseAdmin
                .from('audit_logs')
                .insert({
                    user_id: userEmail, // Store email as identifier
                    action: 'forgot_password_request',
                    details: { 
                        method: isProbablyPhone ? 'phone' : 'email',
                        identifier: identifier.substring(0, 3) + '***' // Partially mask identifier
                    },
                    ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                    user_agent: request.headers.get('user-agent') || 'unknown'
                });
        } catch (logError) {
            console.error('Failed to log forgot password request:', logError);
            // Don't fail the request if logging fails
        }

        // Always return success message for security (don't reveal if user exists)
        return NextResponse.json({ 
            message: 'If an account with that email or phone exists, we\'ve sent a password reset link.',
            remaining: rateLimit.remaining
        }, { 
            status: 200,
            headers: {
                'X-RateLimit-Limit': '3',
                'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
            }
        });

    } catch (err) {
        console.error('Forgot password error:', err);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
