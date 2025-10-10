import { NextRequest, NextResponse } from 'next/server';


const mockProducts = [
  {
    id: '1',
    name: 'Abednego | Chandelier/Large',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 2999,
    originalPrice: 3999,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'],
    category: 'Electronics',
    subcategory: 'Audio',
    brand: 'TechBrand',
    rating: 4.5,
    reviewCount: 128,
    stock: 50,
    sku: 'TB-HP-001',
    tags: ['wireless', 'noise-cancellation', 'premium'],
    specifications: {
      'Battery Life': '30 hours',
      'Connectivity': 'Bluetooth 5.0',
      'Weight': '250g',
      'Noise Cancellation': 'Active',
    },
    isOnSale: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Smart Fitness Watch',
    description: 'Track your fitness goals with this advanced smartwatch',
    price: 4999,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'],
    category: 'Electronics',
    subcategory: 'Wearables',
    brand: 'FitTech',
    rating: 4.8,
    reviewCount: 256,
    stock: 30,
    sku: 'FT-SW-001',
    tags: ['fitness', 'smartwatch', 'health'],
    specifications: {
      'Display': '1.4" AMOLED',
      'Battery Life': '7 days',
      'Water Resistance': '5ATM',
      'Sensors': 'Heart rate, GPS, Accelerometer',
    },
    isNew: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = mockProducts.find(p => p.id === id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await context.params;
    const productIndex = mockProducts.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update product
    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...body,
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: mockProducts[productIndex],
      message: 'Product updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const productIndex = mockProducts.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Remove product
    mockProducts.splice(productIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
