using { ecommerce as db } from '../db/schema';

service CatalogService {
  entity Books as projection on db.Products; // Using Products from ecommerce schema
}