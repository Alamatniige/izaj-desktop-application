import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/orders/[id]
 * Get a single order by ID with items and status history
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
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
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orderId = params.id;

    // Fetch order with items and status history
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        status_history:order_status_history(
          *,
          order by created_at desc
        )
      `)
      .eq('id', orderId)
      .eq('user_id', session.user.id) // Ensure user owns this order
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching order:', error);
      return NextResponse.json(
        { error: 'Failed to fetch order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 * Update order (limited fields for customer)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
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
    
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orderId = params.id;
    const body = await request.json();

    // Check if order exists and belongs to user
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id, status, user_id')
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow updating customer_notes for now
    // Other updates should be done by admin via desktop app
    const allowedFields = ['customer_notes'];
    const updateData: Record<string, string> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error in PATCH /api/orders/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id]
 * Cancel order (only if status is 'pending')
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('🔵 DELETE /api/orders/[id] - Cancelling order:', params.id);
  
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
    console.log('🔵 Auth check for cancel:', session ? '✅ Authenticated' : '❌ Not authenticated');
    
    if (authError || !session) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orderId = params.id;
    const body = await request.json();
    const cancellationReason = body.reason || 'Cancelled by customer';
    console.log('🔵 Cancellation reason:', cancellationReason);

    // Check if order exists and belongs to user
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id, status, user_id')
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .single();

    console.log('🔵 Existing order check:', existingOrder ? '✅ Found' : '❌ Not found');
    console.log('🔵 Order data:', existingOrder);

    if (checkError || !existingOrder) {
      console.error('❌ Order check error:', checkError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow cancelling pending orders
    if (existingOrder.status !== 'pending') {
      console.error('❌ Cannot cancel - status is:', existingOrder.status);
      return NextResponse.json(
        { error: `Only pending orders can be cancelled. Current status: ${existingOrder.status}` },
        { status: 400 }
      );
    }

    console.log('🔵 Updating order to cancelled...');

    // Cancel order
    const { data: cancelledOrder, error: cancelError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationReason,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (cancelError) {
      console.error('❌ Error cancelling order:', cancelError);
      console.error('❌ Error details:', {
        message: cancelError.message,
        code: cancelError.code,
        details: cancelError.details,
        hint: cancelError.hint
      });
      return NextResponse.json(
        { 
          error: `Failed to cancel order: ${cancelError.message}`,
          details: cancelError.details,
          hint: cancelError.hint
        },
        { status: 500 }
      );
    }

    console.log('✅ Order cancelled successfully:', cancelledOrder);

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      data: cancelledOrder
    });
  } catch (error) {
    console.error('Error in DELETE /api/orders/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

