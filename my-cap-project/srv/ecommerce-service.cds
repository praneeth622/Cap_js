using { ecommerce as db } from '../db/schema';

service EcommerceService {
  
  // User Management
  @requires: 'authenticated-user'
  entity Users as projection on db.Users excluding { createdAt, createdBy, modifiedAt, modifiedBy } {
    *,
    addresses: redirected to Addresses,
    orders: redirected to Orders
  } actions {
    action updateProfile(firstName: String, lastName: String, phone: String) returns Users;
    action deactivateAccount() returns Boolean;
  };

  @requires: 'authenticated-user'
  entity Addresses as projection on db.Addresses;

  // Order Addresses Type
  type OrderAddressType {
    street: String(255);
    city: String(100);
    state: String(100);
    zipCode: String(10);
    country: String(100);
    phone: String(20);
    firstName: String(100);
    lastName: String(100);
  };

  // Product Catalog (Public)
  @readonly
  entity Products as projection on db.Products {
    *,
    category: redirected to Categories,
    images: redirected to ProductImages,
    variants: redirected to ProductVariants,
    reviews: redirected to ProductReviews
  } where isActive = true;

  @readonly
  entity Categories as projection on db.Categories {
    *,
    subCategories: redirected to Categories,
    products: redirected to Products
  } where isActive = true;

  @readonly
  entity ProductImages as projection on db.ProductImages;

  @readonly
  entity ProductVariants as projection on db.ProductVariants where isActive = true;

  @requires: 'authenticated-user'
  entity ProductReviews as projection on db.ProductReviews {
    *,
    product: redirected to Products,
    user: redirected to Users
  };

  // Shopping Cart
  @requires: 'authenticated-user'
  entity CartItems as projection on db.CartItems {
    *,
    product: redirected to Products,
    variant: redirected to ProductVariants
  } actions {
    action updateQuantity(quantity: Integer) returns CartItems;
    action clearCart() returns Boolean;
  };

  // Order Management
  @requires: 'authenticated-user'
  @readonly
  entity Orders as projection on db.Orders {
    *,
    items: redirected to OrderItems,
    user: redirected to Users
  } actions {
    action cancelOrder() returns Orders;
    action updateShippingAddress(address: OrderAddressType) returns Orders;
  };

  @requires: 'authenticated-user'
  @readonly
  entity OrderItems as projection on db.OrderItems {
    *,
    product: redirected to Products
  };

  // Admin-only entities
  @requires: 'admin'
  entity AdminProducts as projection on db.Products actions {
    action updateStock(quantity: Integer) returns AdminProducts;
    action toggleActive() returns AdminProducts;
  };

  @requires: 'admin'
  entity AdminOrders as projection on db.Orders actions {
    action updateStatus(status: String) returns AdminOrders;
    action addTrackingNumber(trackingNumber: String) returns AdminOrders;
  };

  @requires: 'admin'
  entity InventoryTransactions as projection on db.InventoryTransactions;

  @requires: 'admin'
  entity Promotions as projection on db.Promotions actions {
    action validatePromoCode(code: String) returns Promotions;
    action applyPromotion(orderId: UUID, promoCode: String) returns Boolean;
  };

  // Public functions
  function searchProducts(query: String, categoryId: UUID, minPrice: Decimal, maxPrice: Decimal, sortBy: String, page: Integer, limit: Integer) returns array of Products;
  function getProductRecommendations(productId: UUID, limit: Integer) returns array of Products;
  function getFeaturedProducts(limit: Integer) returns array of Products;
  function getProductsByCategory(categoryId: UUID, page: Integer, limit: Integer) returns array of Products;

  // User functions
  @requires: 'authenticated-user'
  function getCartSummary() returns {
    itemCount: Integer;
    subtotal: Decimal;
    estimatedTax: Decimal;
    estimatedTotal: Decimal;
  };

  @requires: 'authenticated-user'
  function checkoutPreview() returns {
    items: array of CartItems;
    subtotal: Decimal;
    taxAmount: Decimal;
    shippingAmount: Decimal;
    totalAmount: Decimal;
  };

  @requires: 'authenticated-user'
  action addToCart(productId: UUID, variantId: UUID, quantity: Integer) returns CartItems;

  @requires: 'authenticated-user'
  action createOrder(billingAddress: OrderAddressType, shippingAddress: OrderAddressType, paymentMethod: String, shippingMethod: String, promoCode: String) returns Orders;

  @requires: 'authenticated-user'
  action addProductReview(productId: UUID, rating: Integer, title: String, comment: String) returns ProductReviews;

  // Admin functions
  @requires: 'admin'
  function getOrderAnalytics(startDate: DateTime, endDate: DateTime) returns {
    totalOrders: Integer;
    totalRevenue: Decimal;
    averageOrderValue: Decimal;
    topProducts: array of Products;
  };

  @requires: 'admin'
  function getLowStockProducts(threshold: Integer) returns array of AdminProducts;

  @requires: 'admin'
  action bulkUpdatePrices(categoryId: UUID, percentage: Decimal) returns Boolean;

  @requires: 'admin'
  action processInventoryAdjustment(productId: UUID, variantId: UUID, quantity: Integer, reason: String) returns InventoryTransactions;
}