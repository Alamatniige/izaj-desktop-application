/**
 * Calculate shipping cost based on city
 */
export const calculateShipping = (city: string): number => {
  const shippingRates: { [key: string]: number } = {
    'San Pablo City': 150,
    'Quezon': 200,
    'Laguna': 180,
    'Cavite': 220,
    'Batangas': 250,
    'Camarines Sur': 300,
    'Sorsogon': 350,
    'La Union': 400,
  };
  
  return shippingRates[city] || 200; // Default shipping cost
};

/**
 * Calculate tax (12% VAT)
 */
export const calculateTax = (subtotal: number): number => {
  return subtotal * 0.12;
};

/**
 * Calculate total including shipping and tax
 */
export const calculateTotal = (items: any[], city: string): number => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = calculateShipping(city);
  const tax = calculateTax(subtotal);
  return subtotal + shipping + tax;
};
