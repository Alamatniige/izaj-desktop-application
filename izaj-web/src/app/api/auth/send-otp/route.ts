import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOTP, generateOTP, storeOTP } from '@/lib/sms-service';
import { otpSendLimiter, createRateLimitResponse } from '@/lib/rate-limiter';

type SendOTPBody = {
  phoneNumber: string;
};

export async function POST(request: Request) {
  try {
        // Check rate limit
        const rateLimit = await otpSendLimiter.check(request);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.retryAfter!);
        }

    const body = (await request.json()) as Partial<SendOTPBody>;
    const phoneNumber = (body?.phoneNumber || '').toString().trim();
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Validate phone number format
    const digits = phoneNumber.replace(/\D/g, '');
    const isProbablyPhone = /^\d{10,15}$/.test(digits);
    
    if (!isProbablyPhone) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // Find user by phone number
    let userId = '';
    let userEmail = '';
    
    // Try to find profile by phone number
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
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        message: 'If an account with that phone number exists, we\'ve sent an OTP code.' 
      }, { status: 200 });
    }

    // Generate and store OTP
    const otp = generateOTP();
    const stored = await storeOTP(phoneNumber, otp, userId);
    
    if (!stored) {
      return NextResponse.json({ 
        error: 'Failed to generate OTP. Please try again.' 
      }, { status: 500 });
    }

    // Send OTP via SMS
    const smsResult = await sendOTP(phoneNumber, otp);
    
    if (!smsResult.success) {
      // If SMS fails, clean up the stored OTP
      await supabaseAdmin
        .from('otp_verifications')
        .delete()
        .eq('user_id', userId)
        .eq('otp_code', otp);
      
      return NextResponse.json({ 
        error: 'Failed to send OTP. Please try again.' 
      }, { status: 500 });
    }

    // Log the OTP request
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: 'otp_request',
          details: { 
            method: 'sms',
            phone_number: phoneNumber.substring(0, 3) + '***' // Partially mask phone
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        });
    } catch (logError) {
      console.error('Failed to log OTP request:', logError);
      // Don't fail the request if logging fails
    }

    // Always return success message for security
    return NextResponse.json({ 
      message: 'If an account with that phone number exists, we\'ve sent an OTP code.',
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
    console.error('Send OTP error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
