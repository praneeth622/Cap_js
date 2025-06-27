namespace ecommerce;

using { managed, cuid, Currency } from '@sap/cds/common';

// User Management
entity Users : managed {
  key ID : UUID;
  email : String(255) @assert.unique;
  firstName : String(100);
  lastName : String(100);
  phone : String(20);
  isActive : Boolean default true;
  role : String(20) enum { customer; admin; vendor } default 'customer';
  addresses : Composition of many Addresses on addresses.user = $self;
  orders : Composition of many Orders on orders.user = $self;
  cartItems : Composition of many CartItems on cartItems.user = $self;
}

entity Addresses : cuid {
  user : Association to Users;
  type : String(20) enum { billing; shipping; both } default 'both';
  street : String(255);
  city : String(100);
  state : String(100);
  zipCode : String(10);
  country : String(100);
  isDefault : Boolean default false;
}

// Product Management
entity Categories : cuid, managed {
  name : String(100) @assert.unique;
  description : String(500);
  parentCategory : Association to Categories;
  subCategories : Composition of many Categories on subCategories.parentCategory = $self;
  products : Association to many Products on products.category = $self;
  isActive : Boolean default true;
}

entity Products : cuid, managed {
  name : String(200);
  description : String(2000);
  sku : String(50) @assert.unique;
  category : Association to Categories;
  price : Decimal(10,2);
  comparePrice : Decimal(10,2);
  costPrice : Decimal(10,2);
  stockQuantity : Integer default 0;
  minStockLevel : Integer default 0;
  weight : Decimal(8,2);
  dimensions : String(100);
  images : Composition of many ProductImages on images.product = $self;
  variants : Composition of many ProductVariants on variants.product = $self;
  reviews : Composition of many ProductReviews on reviews.product = $self;
  tags : String(500);
  isActive : Boolean default true;
  isFeatured : Boolean default false;
  seoTitle : String(200);
  seoDescription : String(500);
}

entity ProductImages : cuid {
  product : Association to Products;
  imageUrl : String(500);
  altText : String(200);
  sortOrder : Integer default 0;
  isPrimary : Boolean default false;
}

entity ProductVariants : cuid {
  product : Association to Products;
  name : String(100);
  sku : String(50) @assert.unique;
  price : Decimal(10,2);
  stockQuantity : Integer default 0;
  attributes : String(1000); // JSON string for variant attributes
  isActive : Boolean default true;
}

entity ProductReviews : cuid, managed {
  product : Association to Products;
  user : Association to Users;
  rating : Integer @assert.range: [1,5];
  title : String(200);
  comment : String(2000);
  isVerified : Boolean default false;
  isApproved : Boolean default false;
}

// Shopping Cart
entity CartItems : cuid, managed {
  user : Association to Users;
  product : Association to Products;
  variant : Association to ProductVariants;
  quantity : Integer @assert.range: [1,999];
  unitPrice : Decimal(10,2);
  totalPrice : Decimal(10,2);
}

// Order Management
entity Orders : cuid, managed {
  user : Association to Users;
  orderNumber : String(50) @assert.unique;
  status : String(20) enum { 
    pending; 
    confirmed; 
    processing; 
    shipped; 
    delivered; 
    cancelled; 
    refunded 
  } default 'pending';
  
  // Pricing
  subtotal : Decimal(10,2);
  taxAmount : Decimal(10,2);
  shippingAmount : Decimal(10,2);
  discountAmount : Decimal(10,2) default 0;
  totalAmount : Decimal(10,2);
  
  // Addresses
  billingAddress : Composition of OrderAddresses;
  shippingAddress : Composition of OrderAddresses;
  
  // Order Items
  items : Composition of many OrderItems on items.order = $self;
  
  // Payment & Shipping
  paymentMethod : String(50);
  paymentStatus : String(20) enum { pending; paid; failed; refunded } default 'pending';
  shippingMethod : String(50);
  trackingNumber : String(100);
  
  // Dates
  orderDate : DateTime default $now;
  shippedDate : DateTime;
  deliveredDate : DateTime;
  
  notes : String(1000);
}

entity OrderItems : cuid {
  order : Association to Orders;
  product : Association to Products;
  variant : Association to ProductVariants;
  quantity : Integer;
  unitPrice : Decimal(10,2);
  totalPrice : Decimal(10,2);
  productName : String(200); // Snapshot of product name at time of order
  productSku : String(50); // Snapshot of SKU at time of order
}

entity OrderAddresses : cuid {
  street : String(255);
  city : String(100);
  state : String(100);
  zipCode : String(10);
  country : String(100);
  phone : String(20);
  firstName : String(100);
  lastName : String(100);
}

// Inventory Management
entity InventoryTransactions : cuid, managed {
  product : Association to Products;
  variant : Association to ProductVariants;
  type : String(20) enum { 
    inbound; 
    outbound; 
    adjustment; 
    reserved; 
    released 
  };
  quantity : Integer;
  reason : String(200);
  referenceId : String(100); // Order ID, Purchase ID, etc.
  previousQuantity : Integer;
  newQuantity : Integer;
}

// Promotions & Discounts
entity Promotions : cuid, managed {
  name : String(200);
  description : String(1000);
  code : String(50) @assert.unique;
  type : String(20) enum { percentage; fixed; freeShipping };
  value : Decimal(10,2);
  minOrderAmount : Decimal(10,2);
  maxDiscountAmount : Decimal(10,2);
  usageLimit : Integer;
  usageCount : Integer default 0;
  startDate : DateTime;
  endDate : DateTime;
  isActive : Boolean default true;
}