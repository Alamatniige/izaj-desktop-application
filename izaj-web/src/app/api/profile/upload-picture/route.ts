import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('profilePicture') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    console.log('📤 Uploading file to path:', filePath);
    console.log('📤 File size:', buffer.length, 'bytes');
    console.log('📤 Content type:', file.type);
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user-uploads')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      console.error('❌ Upload error details:', {
        message: uploadError.message,
        name: uploadError.name,
        cause: uploadError.cause
      });
      return NextResponse.json({ 
        error: 'Failed to upload image',
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log('✅ Upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('user-uploads')
      .getPublicUrl(filePath);

    const profilePictureUrl = urlData.publicUrl;
    console.log('🔗 Generated public URL:', profilePictureUrl);

    // Update user profile with the new picture URL
    console.log('💾 Updating profile for user:', user.id);
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        profile_picture: profilePictureUrl,
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      console.error('❌ Profile update error details:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint
      });
      return NextResponse.json({ 
        error: 'Failed to update profile',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Profile updated successfully');

    return NextResponse.json({
      success: true,
      profilePictureUrl,
      message: 'Profile picture updated successfully'
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current profile picture URL
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('profile_picture')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ 
        error: 'Profile not found' 
      }, { status: 404 });
    }

    // Delete from storage if exists
    if (profile.profile_picture) {
      try {
        const url = new URL(profile.profile_picture);
        // Extract the correct file path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/user-uploads/profile-pictures/filename
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part === 'user-uploads');
        if (bucketIndex !== -1 && bucketIndex + 1 < pathParts.length) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/'); // Get 'profile-pictures/filename'
          
          const { error: deleteError } = await supabaseAdmin.storage
            .from('user-uploads')
            .remove([filePath]);

          if (deleteError) {
            console.error('Storage delete error:', deleteError);
          }
        }
      } catch (urlError) {
        console.error('URL parsing error:', urlError);
      }
    }

    // Remove profile picture from database
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        profile_picture: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to remove profile picture' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed successfully'
    });

  } catch (error) {
    console.error('Profile picture delete error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
