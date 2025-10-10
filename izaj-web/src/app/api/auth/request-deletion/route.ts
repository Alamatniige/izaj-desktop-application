import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSupabaseServerClient } from '../../../../lib/supabase-server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { emailService } from '../../../../lib/email-service';

export async function POST() {
  try {
    // Get the currently logged-in user
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate deletion token
    const deletionToken = randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Store deletion token in user metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          deletionToken,
          deletionTokenExpiry: tokenExpiry.toISOString(),
        }
      }
    );

    if (updateError) {
      console.error('Error storing deletion token:', updateError);
      return NextResponse.json({ 
        error: 'Failed to process deletion request' 
      }, { status: 500 });
    }

    // Get user's name for the email
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

    // Send deletion confirmation email
    try {
      await emailService.sendAccountDeletionEmail(
        user.email!,
        deletionToken,
        userName
      );
    } catch (emailError) {
      console.error('Error sending deletion email:', emailError);
      return NextResponse.json({ 
        error: 'Failed to send confirmation email' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Deletion confirmation email sent successfully',
    });

  } catch (error) {
    console.error('Error in request-deletion:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

