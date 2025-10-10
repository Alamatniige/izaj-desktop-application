import { NextRequest, NextResponse } from 'next/server';
import { IzajDesktopApiService } from '../../../services/izajDesktopApi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '100';

    // Fetch from izaj-desktop API with media URLs
    const response = await IzajDesktopApiService.getProductsWithMedia({
      page: parseInt(page),
      limit: parseInt(limit),
      category: category || undefined,
      search: search || undefined,
      // Remove status filter to get all products
    });

    if (response.success) {
      return NextResponse.json({
        success: true,
        data: response.products,
        total: response.pagination.total,
        pagination: response.pagination,
      });
    } else {
      throw new Error('Failed to fetch products from izaj-desktop');
    }
  } catch (error) {
    console.error('Error in products API route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'price', 'category', 'brand'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Create new product
    const newProduct = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In a real app, you would save this to a database
    mockProducts.push(newProduct);

    return NextResponse.json({
      success: true,
      data: newProduct,
      message: 'Product created successfully',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
