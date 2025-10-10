import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { emailService } from '@/lib/email-service';

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const token = searchParams.get('token');

		if (!token) {
			return NextResponse.json({ error: 'Confirmation token is required' }, { status: 400 });
		}

		// Find user with this confirmation token
		const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
		
		if (listError) {
			console.error('Error listing users:', listError);
			return NextResponse.json({ error: 'Failed to verify token' }, { status: 500 });
		}

		const user = users.users.find(u => 
			u.user_metadata?.confirmationToken === token &&
			u.user_metadata?.emailConfirmed === false
		);

		if (!user) {
			return NextResponse.json({ error: 'Invalid or expired confirmation token' }, { status: 400 });
		}

		// Check if token is expired
		const tokenExpiry = new Date(user.user_metadata?.tokenExpiry);
		if (new Date() > tokenExpiry) {
			return NextResponse.json({ error: 'Confirmation token has expired' }, { status: 400 });
		}

		// Update user to mark email as confirmed
		const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
			user.id,
			{
				user_metadata: {
					...user.user_metadata,
					emailConfirmed: true,
					confirmationToken: null, // Clear the token
					tokenExpiry: null, // Clear the expiry
				},
				email_confirm: true, // This marks the email as confirmed in Supabase
			}
		);

		if (updateError) {
			console.error('Error updating user:', updateError);
			return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 });
		}

		// Send welcome email
		try {
			await emailService.sendWelcomeEmail(
				user.email!,
				user.user_metadata?.name || 'User'
			);
		} catch (emailError) {
			console.error('Error sending welcome email:', emailError);
			// Don't fail the confirmation if welcome email fails
		}

		return NextResponse.json({ 
			message: 'Email confirmed successfully! You can now log in to your account.',
			success: true
		}, { status: 200 });

	} catch (err) {
		console.error('Confirmation error:', err);
		return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { token } = body;

		if (!token) {
			return NextResponse.json({ error: 'Confirmation token is required' }, { status: 400 });
		}

		// Find user with this confirmation token
		const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
		
		if (listError) {
			console.error('Error listing users:', listError);
			return NextResponse.json({ error: 'Failed to verify token' }, { status: 500 });
		}

		const user = users.users.find(u => 
			u.user_metadata?.confirmationToken === token &&
			u.user_metadata?.emailConfirmed === false
		);

		if (!user) {
			return NextResponse.json({ error: 'Invalid or expired confirmation token' }, { status: 400 });
		}

		// Check if token is expired
		const tokenExpiry = new Date(user.user_metadata?.tokenExpiry);
		if (new Date() > tokenExpiry) {
			return NextResponse.json({ error: 'Confirmation token has expired' }, { status: 400 });
		}

		// Update user to mark email as confirmed
		const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
			user.id,
			{
				user_metadata: {
					...user.user_metadata,
					emailConfirmed: true,
					confirmationToken: null, // Clear the token
					tokenExpiry: null, // Clear the expiry
				},
				email_confirm: true, // This marks the email as confirmed in Supabase
			}
		);

		if (updateError) {
			console.error('Error updating user:', updateError);
			return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 });
		}

		// Send welcome email
		try {
			await emailService.sendWelcomeEmail(
				user.email!,
				user.user_metadata?.name || 'User'
			);
		} catch (emailError) {
			console.error('Error sending welcome email:', emailError);
			// Don't fail the confirmation if welcome email fails
		}

		return NextResponse.json({ 
			message: 'Email confirmed successfully! You can now log in to your account.',
			success: true
		}, { status: 200 });

	} catch (err) {
		console.error('Confirmation error:', err);
		return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
	}
}
