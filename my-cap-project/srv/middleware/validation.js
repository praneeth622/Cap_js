const Joi = require('joi');

const schemas = {
  user: Joi.object({
    email: Joi.string().email().required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional()
  }),

  product: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(2000).optional(),
    sku: Joi.string().min(1).max(50).required(),
    price: Joi.number().positive().precision(2).required(),
    stockQuantity: Joi.number().integer().min(0).required(),
    categoryId: Joi.string().uuid().required()
  }),

  cartItem: Joi.object({
    productId: Joi.string().uuid().required(),
    variantId: Joi.string().uuid().optional(),
    quantity: Joi.number().integer().min(1).max(999).required()
  }),

  order: Joi.object({
    billingAddress: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
      phone: Joi.string().optional()
    }).required(),
    shippingAddress: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
      phone: Joi.string().optional()
    }).required(),
    paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'paypal').required(),
    shippingMethod: Joi.string().valid('standard', 'express', 'overnight').required(),
    promoCode: Joi.string().optional()
  }),

  review: Joi.object({
    productId: Joi.string().uuid().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().max(200).required(),
    comment: Joi.string().max(2000).required()
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    next();
  };
};

module.exports = { schemas, validate };