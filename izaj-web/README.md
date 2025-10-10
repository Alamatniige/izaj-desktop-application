# E-Commerce Store

A modern, full-featured e-commerce website built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## 🚀 Features

### Core E-Commerce Features
- **Product Catalog**: Browse products with filtering and sorting
- **Shopping Cart**: Add, remove, and update cart items
- **Checkout Process**: Complete order placement with form validation
- **User Authentication**: Login, registration, and profile management
- **Order Management**: Track orders and order history
- **Payment Integration**: Multiple payment methods support

### Technical Features
- **Modern Stack**: Next.js 15 with App Router
- **Type Safety**: Full TypeScript implementation
- **Responsive Design**: Mobile-first responsive design
- **State Management**: Context API and custom hooks
- **API Routes**: RESTful API endpoints
- **Form Handling**: React Hook Form integration
- **Styling**: Tailwind CSS with custom components

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── products/      # Product API endpoints
│   │   └── cart/          # Cart API endpoints
│   ├── cart/              # Shopping cart page
│   ├── checkout/          # Checkout page
│   ├── products/          # Products listing page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # Reusable React components
│   ├── ui/                # Basic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── layout/             # Layout components
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── ecommerce/         # E-commerce specific components
│   │   ├── ProductCard.tsx
│   │   └── CartItem.tsx
│   └── index.ts           # Component exports
├── context/               # React Context providers
│   ├── CartContext.tsx    # Shopping cart state
│   ├── UserContext.tsx    # User authentication state
│   └── index.ts
├── hooks/                 # Custom React hooks
│   ├── useCart.ts         # Cart management hook
│   ├── useProducts.ts     # Products data hook
│   └── index.ts
├── types/                 # TypeScript type definitions
│   ├── product.ts         # Product-related types
│   ├── cart.ts            # Cart-related types
│   ├── user.ts            # User-related types
│   ├── order.ts           # Order-related types
│   └── index.ts
├── utils/                 # Utility functions
│   ├── format.ts          # Formatting utilities
│   ├── validation.ts       # Validation utilities
│   ├── api.ts             # API helper functions
│   └── index.ts
└── lib/                   # Library configurations
    ├── constants.ts        # App constants
    └── index.ts
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecommerce-store
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   # On Windows PowerShell
   Copy-Item env.example .env.local

   # macOS/Linux
   cp env.example .env.local
   ```
   
   Update the environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   # optional, server only
   SUPABASE_SERVICE_ROLE_KEY=
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🎨 Styling

This project uses **Tailwind CSS** for styling. The design system includes:

- **Color Palette**: Blue, gray, and accent colors
- **Typography**: Custom font stack with Geist fonts
- **Components**: Reusable UI components with consistent styling
- **Responsive Design**: Mobile-first approach with responsive breakpoints

## 🔧 Configuration

### App Configuration
Edit `src/lib/constants.ts` to customize:
- App name and description
- Currency settings
- Cart configuration
- Product categories
- Payment methods

### API Configuration
The app includes API endpoints for development:
- `/api/products` - Product management
- `/api/cart` - Cart operations
- `/api/auth/signup` - Sign up with email/password (Supabase)
- `/api/auth/login` - Login with email/password (Supabase)

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint
```

## 📝 API Documentation

### Products API

#### GET /api/products
Fetch products with optional filtering
```typescript
// Query parameters
{
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}
```

#### GET /api/products/[id]
Fetch a single product by ID

#### POST /api/products
Create a new product
```typescript
// Request body
{
  name: string;
  price: number;
  category: string;
  brand: string;
  // ... other product fields
}
```

### Cart API

#### GET /api/cart
Fetch user's cart

#### POST /api/cart
Add item to cart
```typescript
// Request body
{
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}
```

## 🔐 Authentication

The app includes a user authentication system with:
- User registration and login
- Profile management
- Protected routes
- Session management

## 🛒 Shopping Cart

Features include:
- Add/remove items
- Update quantities
- Persistent cart storage
- Cart summary with totals
- Shipping and tax calculations

## 💳 Payment Integration

Supported payment methods:
- Credit/Debit Cards
- GCash
- PayPal
- Bank Transfer

## 📱 Responsive Design

The app is fully responsive and optimized for:
- Mobile devices (320px+)
- Tablets (768px+)
- Desktop (1024px+)
- Large screens (1280px+)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🔮 Future Enhancements

- [ ] User reviews and ratings
- [ ] Wishlist functionality
- [ ] Product recommendations
- [ ] Advanced search with filters
- [ ] Order tracking
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Inventory management
- [ ] Multi-language support
- [ ] Dark mode theme

---

Built with ❤️ using Next.js, React, and TypeScript