import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface SendOTPResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface VerifyOTPResult {
  success: boolean;
  error?: string;
}

/**
 * Send OTP via SMS to phone number
 */
export async function sendOTP(phoneNumber: string, otp: string): Promise<SendOTPResult> {
  try {
    // Check Twilio configuration first
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('❌ Twilio configuration missing:', {
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER
      });
      return {
        success: false,
        error: 'SMS service not configured. Please check environment variables.'
      };
    }

    // Format phone number for Philippines (+63)
    const formattedPhone = formatPhilippinePhone(phoneNumber);
    
    if (!formattedPhone) {
      console.error('❌ Invalid phone number format:', phoneNumber);
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    console.log('📱 Sending SMS:', {
      to: formattedPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      otpLength: otp.length
    });

    const message = await client.messages.create({
      body: `Your IZAJ password reset code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    console.log('✅ SMS sent successfully:', message.sid);
    console.log('📊 SMS Details:', {
      status: message.status,
      to: message.to,
      from: message.from,
      price: message.price,
      priceUnit: message.priceUnit
    });
    return {
      success: true,
      messageId: message.sid,
      status: message.status,
      price: message.price,
      priceUnit: message.priceUnit
    };
  } catch (error) {
    console.error('❌ SMS sending error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('not a valid phone number')) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }
      if (error.message.includes('Authentication Error')) {
        return {
          success: false,
          error: 'SMS service authentication failed. Please check Twilio credentials.'
        };
      }
      if (error.message.includes('not a valid mobile number')) {
        return {
          success: false,
          error: 'Phone number is not a valid mobile number'
        };
      }
    }

    return {
      success: false,
      error: `Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Format Philippine phone number to international format
 */
export function formatPhilippinePhone(phoneNumber: string): string | null {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  console.log('🔍 Formatting phone number:', { input: phoneNumber, digits, length: digits.length });
  
  // Handle different Philippine phone formats
  if (digits.length === 10 && digits.startsWith('9')) {
    // 9XXXXXXXXX format (most common)
    const formatted = `+63${digits}`;
    console.log('✅ Formatted as 10-digit:', formatted);
    return formatted;
  } else if (digits.length === 11 && digits.startsWith('09')) {
    // 09XXXXXXXXX format
    const formatted = `+63${digits.substring(1)}`;
    console.log('✅ Formatted as 11-digit:', formatted);
    return formatted;
  } else if (digits.length === 12 && digits.startsWith('639')) {
    // 639XXXXXXXXX format
    const formatted = `+${digits}`;
    console.log('✅ Formatted as 12-digit:', formatted);
    return formatted;
  } else if (digits.length === 13 && digits.startsWith('639')) {
    // +639XXXXXXXXX format (already has +)
    console.log('✅ Already formatted as 13-digit:', phoneNumber);
    return phoneNumber;
  } else if (digits.length === 13 && digits.startsWith('+639')) {
    // +639XXXXXXXXX format (already has +)
    console.log('✅ Already formatted with +:', phoneNumber);
    return phoneNumber;
  }
  
  console.log('❌ Invalid phone format:', { input: phoneNumber, digits, length: digits.length });
  return null;
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in database with expiration
 */
export async function storeOTP(phoneNumber: string, otp: string, userId: string): Promise<boolean> {
  try {
    // Import supabase admin here to avoid circular dependencies
    const { supabaseAdmin } = await import('./supabase-admin');
    
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    const { error } = await supabaseAdmin
      .from('otp_verifications')
      .insert({
        phone_number: formatPhilippinePhone(phoneNumber),
        otp_code: otp,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing OTP:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error storing OTP:', error);
    return false;
  }
}

/**
 * Verify OTP from database
 */
export async function verifyOTP(phoneNumber: string, otp: string, userId: string): Promise<VerifyOTPResult> {
  try {
    const { supabaseAdmin } = await import('./supabase-admin');
    
    const formattedPhone = formatPhilippinePhone(phoneNumber);
    
    if (!formattedPhone) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    // Find the OTP record
    const { data, error } = await supabaseAdmin
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('otp_code', otp)
      .eq('user_id', userId)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        error: 'Failed to verify OTP'
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Invalid or expired OTP'
      };
    }

    // Mark OTP as used
    await supabaseAdmin
      .from('otp_verifications')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      success: true
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      error: 'Failed to verify OTP'
    };
  }
}

/**
 * Clean up expired OTPs
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    const { supabaseAdmin } = await import('./supabase-admin');
    
    await supabaseAdmin
      .from('otp_verifications')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
}
