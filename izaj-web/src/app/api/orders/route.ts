import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/orders
 * Get all orders for the authenticated user
 */
export async function GET(request: Request) {
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
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    // Get authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `, { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(request: Request) {
  console.log('🔵 POST /api/orders - Starting order creation');
  
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
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore error from Server Component
            }
          },
        },
      }
    );
    
    // Get authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    console.log('🔵 Auth check:', session ? '✅ Authenticated' : '❌ Not authenticated');
    
    if (authError || !session) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('🔵 Request body:', body);

    // Validate required fields
    const requiredFields = [
      'items',
      'shipping_address_line1',
      'shipping_city',
      'shipping_province',
      'shipping_phone',
      'recipient_name',
      'payment_method'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate items
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    // Calculate totals (use cart data directly - no need to fetch products)
    let subtotal = 0;
    const orderItems = [];

    for (const item of body.items) {
      // Use product details from cart instead of fetching from DB
      // This works because cart already has all needed info
      if (!item.name || !item.price) {
        return NextResponse.json(
          { error: `Invalid item data: missing name or price` },
          { status: 400 }
        );
      }

      const itemTotal = parseFloat(item.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: item.product_id,
        product_name: item.name,
        product_image: item.image || '/placeholder.jpg',
        product_sku: item.sku || null,
        unit_price: parseFloat(item.price),
        quantity: item.quantity,
        subtotal: itemTotal,
        discount: 0,
        total: itemTotal,
        product_variant: item.variant || null
      });
    }

    const shipping_fee = body.shipping_fee || 0;
    const discount = body.discount || 0;
    const total_amount = subtotal + shipping_fee - discount;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: session.user.id,
        status: 'pending',
        subtotal,
        shipping_fee,
        discount,
        total_amount,
        shipping_address_line1: body.shipping_address_line1,
        shipping_address_line2: body.shipping_address_line2 || null,
        shipping_city: body.shipping_city,
        shipping_province: body.shipping_province,
        shipping_postal_code: body.shipping_postal_code || null,
        shipping_phone: body.shipping_phone,
        recipient_name: body.recipient_name,
        payment_method: body.payment_method,
        payment_status: 'pending',
        payment_reference: body.payment_reference || null,
        customer_notes: body.customer_notes || null
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating order:', orderError);
      
      // Check if tables don't exist
      if (orderError.message?.includes('relation') || orderError.code === '42P01') {
        return NextResponse.json(
          { error: 'Database tables not found. Please run orders-schema.sql in Supabase. See QUICK_SETUP.md for instructions.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: orderError.message || 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create order items
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id
    }));

    console.log('🔵 Creating order items:', itemsWithOrderId);

    const { data: createdItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId)
      .select();

    if (itemsError) {
      console.error('❌ Error creating order items:', itemsError);
      console.error('❌ Error details:', {
        message: itemsError.message,
        code: itemsError.code,
        details: itemsError.details,
        hint: itemsError.hint
      });
      
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', order.id);
      
      return NextResponse.json(
        { 
          error: `Failed to create order items: ${itemsError.message}`,
          details: itemsError.details,
          hint: itemsError.hint
        },
        { status: 500 }
      );
    }

    console.log('✅ Order items created:', createdItems);

    // Fetch complete order with items
    const { data: completeOrder } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', order.id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: completeOrder
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Error in POST /api/orders:', error);
    
    // Return detailed error
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('❌ Error message:', errorMessage);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
        hint: 'Check server console for details'
      },
      { status: 500 }
    );
  }
}

