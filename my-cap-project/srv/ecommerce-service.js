const cds = require('@sap/cds');

class EcommerceService extends cds.ApplicationService {
  
  async init() {
    
    // User Management Actions
    this.on('updateProfile', 'Users', async (req) => {
      const { ID } = req.params[0];
      const { firstName, lastName, phone } = req.data;
      
      try {
        await UPDATE('ecommerce.Users')
          .set({ firstName, lastName, phone, modifiedAt: new Date() })
          .where({ ID });
        
        return await SELECT.one.from('ecommerce.Users').where({ ID });
      } catch (error) {
        req.reject(500, `Failed to update profile: ${error.message}`);
      }
    });

    this.on('deactivateAccount', 'Users', async (req) => {
      const { ID } = req.params[0];
      
      try {
        await UPDATE('ecommerce.Users')
          .set({ isActive: false, modifiedAt: new Date() })
          .where({ ID });
        
        return true;
      } catch (error) {
        req.reject(500, `Failed to deactivate account: ${error.message}`);
      }
    });

    // Cart Management Actions
    this.on('updateQuantity', 'CartItems', async (req) => {
      const { ID } = req.params[0];
      const { quantity } = req.data;
      
      if (quantity <= 0) {
        req.reject(400, 'Quantity must be greater than 0');
      }
      
      try {
        const cartItem = await SELECT.one.from('ecommerce.CartItems').where({ ID });
        if (!cartItem) {
          req.reject(404, 'Cart item not found');
        }
        
        const totalPrice = cartItem.unitPrice * quantity;
        
        await UPDATE('ecommerce.CartItems')
          .set({ quantity, totalPrice, modifiedAt: new Date() })
          .where({ ID });
        
        return await SELECT.one.from('ecommerce.CartItems').where({ ID });
      } catch (error) {
        req.reject(500, `Failed to update cart item: ${error.message}`);
      }
    });

    this.on('clearCart', 'CartItems', async (req) => {
      const userId = req.user.id; // Assuming user context is available
      
      try {
        await DELETE.from('ecommerce.CartItems').where({ user_ID: userId });
        return true;
      } catch (error) {
        req.reject(500, `Failed to clear cart: ${error.message}`);
      }
    });

    // Add to Cart Action
    this.on('addToCart', async (req) => {
      const { productId, variantId, quantity } = req.data;
      const userId = req.user.id || 'dummy-user-id'; // For testing without auth
      
      if (quantity <= 0) {
        req.reject(400, 'Quantity must be greater than 0');
      }
      
      try {
        // Check product availability
        const product = await SELECT.one.from('ecommerce.Products').where({ ID: productId, isActive: true });
        if (!product) {
          req.reject(404, 'Product not found or inactive');
        }
        
        let variant = null;
        let unitPrice = product.price;
        let availableStock = product.stockQuantity;
        
        if (variantId) {
          variant = await SELECT.one.from('ecommerce.ProductVariants').where({ ID: variantId, isActive: true });
          if (!variant) {
            req.reject(404, 'Product variant not found or inactive');
          }
          unitPrice = variant.price;
          availableStock = variant.stockQuantity;
        }
        
        if (availableStock < quantity) {
          req.reject(400, 'Insufficient stock available');
        }
        
        // Check if item already exists in cart
        const existingCartItem = await SELECT.one.from('ecommerce.CartItems')
          .where({ user_ID: userId, product_ID: productId });
        
        if (existingCartItem) {
          const newQuantity = existingCartItem.quantity + quantity;
          if (availableStock < newQuantity) {
            req.reject(400, 'Insufficient stock for requested quantity');
          }
          
          const totalPrice = unitPrice * newQuantity;
          await UPDATE('ecommerce.CartItems')
            .set({ quantity: newQuantity, totalPrice, modifiedAt: new Date() })
            .where({ ID: existingCartItem.ID });
          
          return await SELECT.one.from('ecommerce.CartItems').where({ ID: existingCartItem.ID });
        } else {
          const totalPrice = unitPrice * quantity;
          const cartItemId = cds.utils.uuid();
          const cartItem = {
            ID: cartItemId,
            user_ID: userId,
            product_ID: productId,
            variant_ID: variantId,
            quantity,
            unitPrice,
            totalPrice,
            createdAt: new Date(),
            modifiedAt: new Date()
          };
          
          await INSERT.into('ecommerce.CartItems').entries(cartItem);
          return await SELECT.one.from('ecommerce.CartItems').where({ ID: cartItemId });
        }
      } catch (error) {
        req.reject(500, `Failed to add item to cart: ${error.message}`);
      }
    });

    // Get Featured Products Function
    this.on('getFeaturedProducts', async (req) => {
      const { limit = 10 } = req.data;
      
      return await SELECT.from('ecommerce.Products')
        .where({ isActive: true, isFeatured: true })
        .limit(limit)
        .orderBy('createdAt desc');
    });

    // Search Products Function
    this.on('searchProducts', async (req) => {
      const { query, categoryId, minPrice, maxPrice, sortBy = 'name', page = 1, limit = 20 } = req.data;
      
      let whereConditions = ['isActive = true'];
      
      if (query) {
        whereConditions.push(`(name LIKE '%${query}%' OR description LIKE '%${query}%' OR tags LIKE '%${query}%')`);
      }
      
      if (categoryId) {
        whereConditions.push(`category_ID = '${categoryId}'`);
      }
      
      if (minPrice) {
        whereConditions.push(`price >= ${minPrice}`);
      }
      
      if (maxPrice) {
        whereConditions.push(`price <= ${maxPrice}`);
      }
      
      const offset = (page - 1) * limit;
      const whereClause = whereConditions.join(' AND ');
      
      return await cds.run(`
        SELECT * FROM ecommerce_Products 
        WHERE ${whereClause}
        ORDER BY ${sortBy}
        LIMIT ${limit} OFFSET ${offset}
      `);
    });

    // Get Cart Summary Function
    this.on('getCartSummary', async (req) => {
      const userId = req.user.id || 'dummy-user-id';
      
      const cartItems = await SELECT.from('ecommerce.CartItems').where({ user_ID: userId });
      
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
      const estimatedTax = subtotal * 0.08;
      const estimatedTotal = subtotal + estimatedTax + 5.00; // Assume standard shipping
      
      return {
        itemCount,
        subtotal,
        estimatedTax,
        estimatedTotal
      };
    });

    // Create Order Action
    this.on('createOrder', async (req) => {
      const { billingAddress, shippingAddress, paymentMethod, shippingMethod, promoCode } = req.data;
      const userId = req.user.id || 'dummy-user-id';
      
      try {
        // Get cart items
        const cartItems = await SELECT.from('ecommerce.CartItems')
          .where({ user_ID: userId });
        
        if (!cartItems || cartItems.length === 0) {
          req.reject(400, 'Cart is empty');
        }
        
        // Calculate totals
        let subtotal = 0;
        for (const item of cartItems) {
          subtotal += parseFloat(item.totalPrice);
        }
        
        const taxAmount = subtotal * 0.08; // 8% tax rate
        const shippingAmount = shippingMethod === 'express' ? 15.00 : 5.00;
        const totalAmount = subtotal + taxAmount + shippingAmount;
        
        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        // Create order
        const orderId = cds.utils.uuid();
        const orderData = {
          ID: orderId,
          user_ID: userId,
          orderNumber,
          status: 'pending',
          subtotal,
          taxAmount,
          shippingAmount,
          discountAmount: 0,
          totalAmount,
          paymentMethod,
          shippingMethod,
          orderDate: new Date(),
          createdAt: new Date(),
          modifiedAt: new Date()
        };
        
        await INSERT.into('ecommerce.Orders').entries(orderData);
        
        // Clear cart
        await DELETE.from('ecommerce.CartItems').where({ user_ID: userId });
        
        return await SELECT.one.from('ecommerce.Orders').where({ ID: orderId });
        
      } catch (error) {
        req.reject(500, `Failed to create order: ${error.message}`);
      }
    });

    // Order Management Actions
    this.on('cancelOrder', 'Orders', async (req) => {
      const { ID } = req.params[0];
      
      try {
        const order = await SELECT.one.from('ecommerce.Orders').where({ ID });
        if (!order) {
          req.reject(404, 'Order not found');
        }
        
        if (!['pending', 'confirmed'].includes(order.status)) {
          req.reject(400, 'Order cannot be cancelled at this stage');
        }
        
        await UPDATE('ecommerce.Orders')
          .set({ status: 'cancelled', modifiedAt: new Date() })
          .where({ ID });
        
        return await SELECT.one.from('ecommerce.Orders').where({ ID });
      } catch (error) {
        req.reject(500, `Failed to cancel order: ${error.message}`);
      }
    });

    // Admin Functions
    this.on('updateStatus', 'AdminOrders', async (req) => {
      const { ID } = req.params[0];
      const { status } = req.data;
      
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        req.reject(400, 'Invalid order status');
      }
      
      try {
        await UPDATE('ecommerce.Orders')
          .set({ 
            status, 
            shippedDate: status === 'shipped' ? new Date() : undefined,
            deliveredDate: status === 'delivered' ? new Date() : undefined,
            modifiedAt: new Date() 
          })
          .where({ ID });
        
        return await SELECT.one.from('ecommerce.Orders').where({ ID });
      } catch (error) {
        req.reject(500, `Failed to update order status: ${error.message}`);
      }
    });

    this.on('getLowStockProducts', async (req) => {
      const { threshold = 10 } = req.data;
      
      return await SELECT.from('ecommerce.Products')
        .where(`stockQuantity < ${threshold} AND isActive = true`)
        .orderBy('stockQuantity');
    });

    return super.init();
  }
}

module.exports = EcommerceService;