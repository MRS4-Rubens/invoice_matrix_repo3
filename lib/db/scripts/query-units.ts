import { db } from '../client';
import { products } from '../schema';
import { inArray } from 'drizzle-orm';

async function queryInvalidUnits() {
  const invalidUnits = ['HRS', 'KG', 'DZN'];
  const result = await db
    .select({ id: products.id, name: products.name, unit: products.unit_of_measurement })
    .from(products)
    .where(inArray(products.unit_of_measurement, invalidUnits));
  
  console.log('Query result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

queryInvalidUnits().catch(console.error);
