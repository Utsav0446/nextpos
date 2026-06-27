const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local to resolve DATABASE_URL dynamically
const envPath = path.join(__dirname, '..', '.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
  if (match) {
    databaseUrl = match[1];
  }
}

if (!databaseUrl) {
  console.error('Error: DATABASE_URL not found in process environment or local .env.local config.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Connecting to PostgreSQL and initiating seed transaction...');
    await client.query('BEGIN');

    // Ensure all tables are created by running the schema sql first
    console.log('Ensuring database tables are initialized...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('Database schema applied successfully.');
    } else {
      console.warn('Warning: schema.sql not found at', schemaPath);
    }

    // Wipe transaction tables to set up clean dashboard metrics
    console.log('Truncating old tables to clear previous configurations...');
    await client.query(`
      TRUNCATE TABLE 
        audit_logs,
        purchase_history,
        inventory,
        suppliers,
        expenses,
        order_items,
        orders,
        menu_items,
        categories
      RESTART IDENTITY CASCADE
    `);

    // 1. Seed Categories
    console.log('Inserting default menu categories...');
    const catRes = await client.query(`
      INSERT INTO categories (name, description) VALUES
      ('Starter', 'Appetizers and quick snacks'),
      ('Main Course', 'Hearty main dishes and curries'),
      ('Beverages', 'Refreshing cold and hot drinks'),
      ('Desserts', 'Sweet treats and ice creams')
      RETURNING id, name
    `);
    const categoryMap = {};
    catRes.rows.forEach((row) => {
      categoryMap[row.name] = row.id;
    });

    // 2. Seed Menu Items
    console.log('Inserting default menu items...');
    const menuRes = await client.query(`
      INSERT INTO menu_items (category_id, name, description, price, is_veg, preparation_time, is_available) VALUES
      (${categoryMap['Starter']}, 'Spring Rolls', 'Crispy wrapped mixed vegetable rolls', 150.00, true, 10, true),
      (${categoryMap['Starter']}, 'Chicken Tikka', 'Spicy clay-oven grilled chicken pieces', 280.00, false, 15, true),
      (${categoryMap['Starter']}, 'Gobi Manchurian', 'Crispy cauliflower florets in sweet & sour sauce', 180.00, true, 12, true),
      (${categoryMap['Main Course']}, 'Paneer Butter Masala', 'Soft cottage cheese in rich tomato gravy', 240.00, true, 15, true),
      (${categoryMap['Main Course']}, 'Chicken Biryani', 'Aromatic rice dish cooked with tender chicken', 320.00, false, 20, true),
      (${categoryMap['Main Course']}, 'Dal Makhani', 'Slow cooked black lentils with butter and cream', 210.00, true, 18, true),
      (${categoryMap['Beverages']}, 'Fresh Lime Soda', 'Refreshing sweet & salty lime drink', 80.00, true, 5, true),
      (${categoryMap['Beverages']}, 'Masala Chai', 'Spiced Indian milk tea brewed with cardamom', 40.00, true, 8, true),
      (${categoryMap['Desserts']}, 'Chocolate Brownie', 'Warm chocolate cake with hot chocolate sauce', 120.00, true, 8, true),
      (${categoryMap['Desserts']}, 'Gulab Jamun', 'Warm milk dumplings soaked in sugar syrup', 90.00, true, 5, true)
      RETURNING id, name, price
    `);
    const menuItemsList = menuRes.rows;

    // 3. Seed Suppliers
    console.log('Inserting default suppliers...');
    const supRes = await client.query(`
      INSERT INTO suppliers (name, contact_name, phone, email, address) VALUES
      ('Metro Farms Wholesale', 'Ramesh Patel', '+91 9898012345', 'sales@metrofarms.com', 'APMC Market, Sector 19'),
      ('Golden Grain Mills', 'Sandeep Singh', '+91 9797054321', 'grain@goldengrain.com', 'FCI Road, Phase II'),
      ('Amul Dairy Distributor', 'Karan Shah', '+91 9999011122', 'dist@amuldairy.com', 'D-12, MIDC Area')
      RETURNING id, name
    `);
    const suppliersList = supRes.rows;

    // 4. Seed Inventory Stock
    console.log('Inserting stock levels...');
    const invRes = await client.query(`
      INSERT INTO inventory (name, stock_quantity, unit, low_stock_threshold, supplier_id) VALUES
      ('Basmati Rice', 120.00, 'kg', 20.00, ${suppliersList[1].id}),
      ('Paneer (Cottage Cheese)', 8.50, 'kg', 10.00, ${suppliersList[2].id}),
      ('Chicken Breasts', 18.00, 'kg', 15.00, ${suppliersList[0].id}),
      ('Cooking Oil', 45.00, 'ltr', 15.00, ${suppliersList[0].id}),
      ('Amul Butter', 4.20, 'kg', 5.00, ${suppliersList[2].id}),
      ('Fresh Onions', 85.00, 'kg', 25.00, ${suppliersList[0].id})
      RETURNING id, name, stock_quantity
    `);
    const inventoryList = invRes.rows;

    // 5. Seed Purchase History
    console.log('Inserting supply purchase logs...');
    await client.query(`
      INSERT INTO purchase_history (inventory_id, supplier_id, quantity, unit_price, total_cost, purchase_date) VALUES
      (${inventoryList[0].id}, ${suppliersList[1].id}, 100.00, 75.00, 7500.00, CURRENT_DATE - INTERVAL '6 days'),
      (${inventoryList[3].id}, ${suppliersList[0].id}, 50.00, 110.00, 5500.00, CURRENT_DATE - INTERVAL '4 days'),
      (${inventoryList[1].id}, ${suppliersList[2].id}, 15.00, 280.00, 4200.00, CURRENT_DATE - INTERVAL '2 days'),
      (${inventoryList[5].id}, ${suppliersList[0].id}, 50.00, 35.00, 1750.00, CURRENT_DATE - INTERVAL '1 day')
    `);

    // 6. Seed Expenses
    console.log('Inserting restaurant overhead expenses...');
    await client.query(`
      INSERT INTO expenses (category, amount, reason, notes, expense_date) VALUES
      ('Rent', 25000.00, 'Monthly Store Rent', 'Paid for current month tenancy', CURRENT_DATE - INTERVAL '10 days'),
      ('Salary', 18000.00, 'Kitchen Helper Wages', 'Wages paid to Rahul chef helper', CURRENT_DATE - INTERVAL '8 days'),
      ('Gas', 1150.00, 'Commercial LPG Cylinder refilled', 'Refilled 19kg commercial cylinder', CURRENT_DATE - INTERVAL '5 days'),
      ('Utilities', 4500.00, 'Electricity Bill Payment', 'MSEDCL Commercial bill', CURRENT_DATE - INTERVAL '2 days'),
      ('Vegetables', 1450.00, 'Daily fresh vegetable supply purchase', 'Bought tomatoes, onions, green chilies', CURRENT_DATE - INTERVAL '1 day')
    `);

    // 7. Seed Orders and order items (7-day timeline spread)
    console.log('Simulating 7 days of sales transactions...');
    const orderTypes = ['Dine-In', 'Takeaway', 'Delivery'];
    const paymentTypes = ['UPI', 'Cash', 'Card'];
    const customerNames = ['Aarav', 'Neha', 'Vihaan', 'Aditi', 'Kabir', 'Riya', 'Arjun', 'Ananya', 'Vivaan', 'Sai', 'Vikram', 'Priya'];

    let orderCount = 0;
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      // 5-9 orders daily
      const dailyOrdersNum = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < dailyOrdersNum; i++) {
        const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
        const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
        const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
        const tableNumber = orderType === 'Dine-In' ? String(1 + Math.floor(Math.random() * 10)) : null;

        // Choose 1-3 items
        const itemsNum = 1 + Math.floor(Math.random() * 3);
        const selectedItems = [];
        let subtotal = 0;

        const shuffled = [...menuItemsList].sort(() => 0.5 - Math.random());
        for (let k = 0; k < itemsNum; k++) {
          const qty = 1 + Math.floor(Math.random() * 2);
          const item = shuffled[k];
          const itemTotal = qty * Number(item.price);
          subtotal += itemTotal;
          selectedItems.push({
            id: item.id,
            name: item.name,
            qty,
            price: Number(item.price),
            total: itemTotal,
          });
        }

        const tax = Number((subtotal * 0.05).toFixed(2));
        const discount = Math.random() > 0.85 ? 50.00 : 0.00;
        const grandTotal = subtotal + tax - discount;

        // Today might contain pending KOTs
        const isCompleted = dayOffset > 0 || Math.random() > 0.2;
        const status = isCompleted ? 'Completed' : 'Pending';
        const paidAmount = isCompleted ? grandTotal : 0.00;
        const remainingAmount = isCompleted ? 0.00 : grandTotal;

        const orderRes = await client.query(`
          INSERT INTO orders (customer_name, table_number, order_type, status, subtotal, discount, tax, grand_total, paid_amount, remaining_amount, payment_type, notes, created_at, completed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE - $13 * INTERVAL '1 day' + $14 * INTERVAL '1 hour', CASE WHEN $15 THEN CURRENT_DATE - $13 * INTERVAL '1 day' + ($14 + 1) * INTERVAL '1 hour' ELSE NULL END)
          RETURNING id
        `, [
          customerName,
          tableNumber,
          orderType,
          status,
          subtotal,
          discount,
          tax,
          grandTotal,
          paidAmount,
          remainingAmount,
          isCompleted ? paymentType : null,
          Math.random() > 0.85 ? 'Make it extra spicy.' : null,
          dayOffset,
          11 + i, // hour of order placement
          isCompleted,
        ]);

        const orderId = orderRes.rows[0].id;

        // Insert items list
        for (const item of selectedItems) {
          await client.query(`
            INSERT INTO order_items (order_id, menu_item_id, name, quantity, price, total_price)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [orderId, item.id, item.name, item.qty, item.price, item.total]);
        }
        orderCount++;
      }
    }

    // 8. Seed Audit Logs
    console.log('Inserting timeline activity audit logs...');
    await client.query(`
      INSERT INTO audit_logs (action, details) VALUES
      ('SEED_SYSTEM', 'Database seeded with default menu catalog, supplier listings, ingredients catalog, and past transactions.'),
      ('SEED_COMPLETED', 'Demo initialization complete. System statistics are fully ready.')
    `);

    await client.query('COMMIT');
    console.log(`Database seeded successfully! Generated ${orderCount} orders, categories, ingredients, and expenses.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to complete seed transactions, rolling back:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
