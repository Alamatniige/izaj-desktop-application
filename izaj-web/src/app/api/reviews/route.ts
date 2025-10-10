import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { order_id, order_number, items, rating, comment } = body;

    console.log('📝 [API] Received review submission:', {
      order_id,
      order_number,
      items_count: items?.length,
      rating,
      comment_length: comment?.length
    });

    if (!order_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid review data' },
        { status: 400 }
      );
    }

    // Create reviews for each product in the order
    const reviewsToInsert = items.map((item: any) => ({
      user_id: user.id,
      product_id: item.product_id,
      order_id: order_id,
      rating: rating,
      comment: comment,
      product_name: item.product_name,
      order_number: order_number,
      created_at: new Date().toISOString()
    }));

    console.log('💾 [API] Inserting reviews:', reviewsToInsert);

    // Insert reviews into database
    const { data, error } = await supabase
      .from('product_reviews')
      .insert(reviewsToInsert)
      .select();

    if (error) {
      console.error('❌ [API] Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('✅ [API] Reviews created successfully:', data);

    return NextResponse.json({
      success: true,
      message: 'Reviews submitted successfully',
      data: data
    });

  } catch (error: any) {
    console.error('❌ [API] Error creating reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit reviews' },
      { status: 500 }
    );
  }
}

