// Debug utility to check Twilio configuration
import twilio from 'twilio';

export function checkTwilioConfig() {
  const config = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  };

  console.log('🔍 Twilio Configuration Check:');
  console.log('Account SID:', config.accountSid ? '✅ Set' : '❌ Missing');
  console.log('Auth Token:', config.authToken ? '✅ Set' : '❌ Missing');
  console.log('Phone Number:', config.phoneNumber ? `✅ ${config.phoneNumber}` : '❌ Missing');

  // More detailed logging
  console.log('Raw environment check:', {
    hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
    accountSidLength: process.env.TWILIO_ACCOUNT_SID?.length || 0,
    phoneNumberValue: process.env.TWILIO_PHONE_NUMBER || 'undefined'
  });

  if (!config.accountSid || !config.authToken || !config.phoneNumber) {
    console.error('❌ Twilio configuration is incomplete!');
    console.error('Missing values:', {
      accountSid: !config.accountSid,
      authToken: !config.authToken,
      phoneNumber: !config.phoneNumber
    });
    return false;
  }

  // Validate Account SID format
  if (!config.accountSid.startsWith('AC')) {
    console.error('❌ Account SID should start with "AC", got:', config.accountSid.substring(0, 5) + '...');
    return false;
  }

  // Validate phone number format
  if (!config.phoneNumber.startsWith('+')) {
    console.error('❌ Phone number should start with "+", got:', config.phoneNumber);
    return false;
  }

  console.log('✅ Twilio configuration looks valid');
  return true;
}

export async function testTwilioConnection() {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Test connection by fetching account info
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio connection successful');
    console.log('Account Status:', account.status);
    console.log('Account Name:', account.friendlyName);
    return true;
  } catch (error) {
    console.error('❌ Twilio connection failed:', error);
    return false;
  }
}
