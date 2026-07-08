-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    name_gu VARCHAR(100),
    name_hi VARCHAR(100),
    description TEXT,
    description_gu TEXT,
    description_hi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    name_gu VARCHAR(150),
    name_hi VARCHAR(150),
    description TEXT,
    description_gu TEXT,
    description_hi TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    is_veg BOOLEAN DEFAULT TRUE,
    preparation_time INT, -- in minutes
    allow_spice BOOLEAN DEFAULT TRUE,
    allow_prep BOOLEAN DEFAULT TRUE,
    allow_notes BOOLEAN DEFAULT TRUE,
    allow_texture BOOLEAN DEFAULT FALSE,
    default_spice VARCHAR(50) DEFAULT 'Regular',
    default_prep VARCHAR(50) DEFAULT 'Regular',
    default_texture VARCHAR(50) DEFAULT 'Regular',
    show_popup BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(150),
    table_number VARCHAR(50),
    order_type VARCHAR(50) NOT NULL, -- 'Dine In', 'Parcel', 'Take Away'
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Preparing', 'Completed', 'Cancelled'
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    tax DECIMAL(10, 2) DEFAULT 0.00, -- GST
    grand_total DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    remaining_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_type VARCHAR(50), -- 'Cash', 'UPI', 'Card'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INT REFERENCES menu_items(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);

-- Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL, -- 'Salary', 'Vegetables', 'Milk', 'Gas', 'Rent', 'Electricity', 'Internet', 'Misc'
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    notes TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    stock_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) NOT NULL, -- 'kg', 'ltr', 'pcs', 'packet'
    low_stock_threshold DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Purchase History Table
CREATE TABLE IF NOT EXISTS purchase_history (
    id SERIAL PRIMARY KEY,
    inventory_id INT REFERENCES inventory(id) ON DELETE CASCADE,
    supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Restaurant Settings Table
CREATE TABLE IF NOT EXISTS restaurant_settings (
    id SERIAL PRIMARY KEY,
    restaurant_name VARCHAR(150) DEFAULT 'My Restaurant',
    address TEXT,
    phone VARCHAR(50),
    gstin VARCHAR(50),
    gst_percentage DECIMAL(5, 2) DEFAULT 5.00,
    currency VARCHAR(10) DEFAULT 'INR',
    printer_name VARCHAR(150),
    print_kot_automatically BOOLEAN DEFAULT TRUE,
    enable_token_number BOOLEAN DEFAULT TRUE,
    printer_ip VARCHAR(50) DEFAULT '127.0.0.1',
    printer_port INT DEFAULT 9100,
    bill_printer_ip VARCHAR(50) DEFAULT '127.0.0.1',
    bill_printer_port INT DEFAULT 9100,
    kot_printer_ip VARCHAR(50) DEFAULT '127.0.0.1',
    kot_printer_port INT DEFAULT 9100,
    enable_gst BOOLEAN DEFAULT TRUE,
    logo_url TEXT,
    receipt_header TEXT,
    receipt_footer TEXT,
    kot_copies INT DEFAULT 1,
    paper_width VARCHAR(20) DEFAULT '80mm',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Users Table (for Admin and role-based login)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Restaurant Tables Table
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(50) UNIQUE NOT NULL,
    capacity INT DEFAULT 4,
    original_capacity INT,
    status VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Dirty'
    merged_with INT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    split_from INT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES — covers every hot query path
-- ============================================================

-- Menu Items: category filter with soft-delete exclusion
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id) WHERE deleted_at IS NULL;

-- Orders: primary lookup patterns
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
-- Composite: dashboard/reports filter by status + date range
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
-- Table lookup for the lateral join in getTables() — case-insensitive match
CREATE INDEX IF NOT EXISTS idx_orders_table_lower_status ON orders(LOWER(table_number), status);
-- Date-only queries (reports use created_at::date comparisons)
CREATE INDEX IF NOT EXISTS idx_orders_created_date ON orders((created_at::date));

-- Order Items: FK join (PostgreSQL does NOT auto-index FKs)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON order_items(menu_item_id);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expenses(category, expense_date);

-- Purchase History
CREATE INDEX IF NOT EXISTS idx_purchase_history_date ON purchase_history(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_history_inventory ON purchase_history(inventory_id);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);

-- Audit Logs: recent-first lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Restaurant Tables: status filter
CREATE INDEX IF NOT EXISTS idx_tables_status ON restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_merged_with ON restaurant_tables(merged_with);

-- Seed Initial Users (Password: admin123 for all, roles: Admin, Cashier, Waiter, Kitchen)
-- Hash is bcrypt with salt rounds = 10
INSERT INTO users (email, password_hash, role) VALUES
('admin@restaurant.com', '$2b$10$EPf52dxG9eR9E2c1eQ9U9eqsN0LwW.a4y3P/1gTux1Vp4mUqgYhye', 'Admin'),
('cashier@restaurant.com', '$2b$10$EPf52dxG9eR9E2c1eQ9U9eqsN0LwW.a4y3P/1gTux1Vp4mUqgYhye', 'Cashier'),
('waiter@restaurant.com', '$2b$10$EPf52dxG9eR9E2c1eQ9U9eqsN0LwW.a4y3P/1gTux1Vp4mUqgYhye', 'Waiter'),
('kitchen@restaurant.com', '$2b$10$EPf52dxG9eR9E2c1eQ9U9eqsN0LwW.a4y3P/1gTux1Vp4mUqgYhye', 'Kitchen')
ON CONFLICT (email) DO NOTHING;

-- Seed Default Restaurant Settings
INSERT INTO restaurant_settings (id, restaurant_name, address, phone, gstin, gst_percentage, currency, bill_printer_ip, bill_printer_port, kot_printer_ip, kot_printer_port)
VALUES (1, 'Gastronomy POS', '123 Food Street, Culinary City', '+91 98765 43210', '22AAAAA0000A1Z5', 5.00, 'INR', '127.0.0.1', 9100, '127.0.0.1', 9100)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Categories
INSERT INTO categories (name, name_gu, name_hi, description, description_gu, description_hi) VALUES
('Starter', 'સ્ટાર્ટર', 'स्टार्टर', 'Appetizers and quick bites', 'એપેટાઇઝર્સ અને ઝડપી બાઇટ્સ', 'ऐपेटाइज़र और त्वरित काटने'),
('Main Course', 'મુખ્ય ભોજન', 'मुख्य भोजन', 'Hearty main dishes', 'દિલદાર મુખ્ય વાનગીઓ', 'हार्दिक मुख्य व्यंजन'),
('Beverages', 'પીણાં', 'पेय पदार्थ', 'Refreshing drinks and mocktails', 'તાજગી આપનારા પીણાં અને મોકટેલ', 'ताज़ा पेय और मॉकटेल'),
('Desserts', 'મીઠાઈ', 'मीठा', 'Sweet treats to end your meal', 'તમારા ભોજનને સમાપ્ત કરવા માટે મીઠી વાનગીઓ', 'आपके भोजन को समाप्त करने के लिए मीठी दावतें')
ON CONFLICT (name) DO NOTHING;

-- Seed Default Menu Items
INSERT INTO menu_items (category_id, name, description, price, is_veg, preparation_time) VALUES
(1, 'Spring Rolls', 'Crispy wrapper stuffed with mixed vegetables', 150.00, TRUE, 12),
(1, 'Chicken Tikka', 'Tender pieces of chicken marinated in spices and grilled', 280.00, FALSE, 18),
(2, 'Paneer Butter Masala', 'Soft cottage cheese cubes in rich creamy tomato gravy', 240.00, TRUE, 15),
(2, 'Chicken Biryani', 'Fragrant basmati rice cooked with spiced chicken and herbs', 320.00, FALSE, 20),
(3, 'Fresh Lime Soda', 'Refreshing lime juice with sparkling soda', 80.00, TRUE, 5),
(4, 'Chocolate Brownie', 'Warm fudge brownie served with chocolate sauce', 120.00, TRUE, 8)
ON CONFLICT DO NOTHING;


-- Seed Default Tables
INSERT INTO restaurant_tables (table_number, capacity, original_capacity) VALUES
('T-1', 2, 2),
('T-2', 2, 2),
('T-3', 4, 4),
('T-4', 4, 4),
('T-5', 6, 6),
('T-6', 6, 6),
('T-7', 8, 8),
('T-8', 8, 8)
ON CONFLICT (table_number) DO NOTHING;

-- generic sql executor rpc helper for compatibility
CREATE OR REPLACE FUNCTION exec_sql(query_text text, query_params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    res jsonb;
    p_val text;
    i int;
    final_query text := query_text;
BEGIN
    IF jsonb_array_length(query_params) > 0 THEN
        FOR i IN REVERSE jsonb_array_length(query_params) - 1 .. 0 LOOP
            p_val := query_params->>i;
            IF p_val IS NULL THEN
                p_val := 'NULL';
            ELSE
                p_val := quote_literal(p_val);
            END IF;
            final_query := replace(final_query, '$' || (i + 1), p_val);
        END LOOP;
    END IF;

    BEGIN
        IF upper(trim(final_query)) LIKE 'SELECT%' OR upper(final_query) LIKE '%RETURNING%' THEN
            EXECUTE 'SELECT COALESCE(json_agg(t), ''[]''::jsonb) FROM (' || final_query || ') t' INTO res;
        ELSE
            EXECUTE final_query;
            res := '[]'::jsonb;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION '% (Executed: %)', SQLERRM, final_query;
    END;

    RETURN res;
END;
$$;


