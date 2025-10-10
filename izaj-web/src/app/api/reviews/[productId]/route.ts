import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
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

    const productId = params.productId;

    console.log('📊 [API] Fetching reviews for product:', productId);

    // Get reviews for this product
    const { data: reviews, error: reviewsError } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('❌ [API] Error fetching reviews:', reviewsError);
      return NextResponse.json(
        { success: false, error: reviewsError.message },
        { status: 500 }
      );
    }

    // Get ratings summary
    const { data: summary, error: summaryError } = await supabase
      .from('product_ratings_summary')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') {
      console.error('❌ [API] Error fetching summary:', summaryError);
    }

    console.log('✅ [API] Reviews fetched:', {
      total: reviews?.length || 0,
      average: summary?.average_rating || 0
    });

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviews || [],
        summary: summary || {
          total_reviews: 0,
          average_rating: 0,
          five_star: 0,
          four_star: 0,
          three_star: 0,
          two_star: 0,
          one_star: 0
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

