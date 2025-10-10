import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyOTP } from '@/lib/sms-service';
import { otpVerifyLimiter, createRateLimitResponse } from '@/lib/rate-limiter';

type VerifyOTPBody = {
  phoneNumber: string;
  otp: string;
};

export async function POST(request: Request) {
  try {
    // Check rate limit
    const rateLimit = await otpVerifyLimiter.check(request);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.retryAfter!);
    }

    const body = (await request.json()) as Partial<VerifyOTPBody>;
    const { phoneNumber, otp } = body;
    
    if (!phoneNumber || !otp) {
      return NextResponse.json({ 
        error: 'Phone number and OTP are required' 
      }, { status: 400 });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ 
        error: 'OTP must be 6 digits' 
      }, { status: 400 });
    }

    // Find user by phone number (same logic as send-otp)
    const digits = phoneNumber.replace(/\D/g, '');
    const candidates: string[] = [];
    
    if (digits) {
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

      candidates.push(digits, local10, local0, cc63, plus63);
    }

    // Try to find profile by any candidate value
    let userId = '';
    let userEmail = '';
    
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
      const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      userId = profile.id;
      userEmail = userResp?.user?.email || '';
    } else {
      // Fallback: scan auth users for matching metadata.phone
      try {
        const uniqueCands = new Set(candidates);
        const raw = phoneNumber.replace(/\D/g, '');
        let targetLocal10 = raw;
        if (raw.startsWith('63') && raw.length >= 12) targetLocal10 = raw.slice(-10);
        else if (raw.startsWith('0') && raw.length >= 11) targetLocal10 = raw.slice(-10);
        else if (raw.length >= 10) targetLocal10 = raw.slice(-10);

        let page = 1;
        const perPage = 100;
        let found: { id: string; email: string } | null = null;
        
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
              found = { id: u.id, email: u.email || '' };
              break;
            }
          }
          if (found) break;
          if (!list || users.length < perPage) break;
          page += 1;
        }
        if (found) {
          userId = found.id;
          userEmail = found.email;
        }
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ 
        error: 'Invalid phone number or OTP' 
      }, { status: 400 });
    }

    // Verify the OTP
    const verificationResult = await verifyOTP(phoneNumber, otp, userId);
    
    if (!verificationResult.success) {
      return NextResponse.json({ 
        error: verificationResult.error || 'Invalid or expired OTP' 
      }, { status: 400 });
    }

    // Log successful OTP verification
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: 'otp_verification',
          details: { 
            method: 'sms',
            phone_number: phoneNumber.substring(0, 3) + '***' // Partially mask phone
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        });
    } catch (logError) {
      console.error('Failed to log OTP verification:', logError);
      // Don't fail the request if logging fails
    }

    // Return success with user info for password reset
    return NextResponse.json({ 
      success: true,
      message: 'OTP verified successfully',
      userId: userId,
      email: userEmail
    }, { status: 200 });

  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
