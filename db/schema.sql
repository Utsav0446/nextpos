-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    is_veg BOOLEAN DEFAULT TRUE,
    preparation_time INT, -- in minutes
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Users Table (for Admin login)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_purchase_history_date ON purchase_history(purchase_date);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);

-- Seed Initial Admin User (Email: admin@restaurant.com, Password: admin123)
-- Hash is bcrypt with salt rounds = 10
INSERT INTO users (email, password_hash)
VALUES ('admin@restaurant.com', '$2b$10$EPf52dxG9eR9E2c1eQ9U9eqsN0LwW.a4y3P/1gTux1Vp4mUqgYhye')
ON CONFLICT (email) DO NOTHING;

-- Seed Default Restaurant Settings
INSERT INTO restaurant_settings (id, restaurant_name, address, phone, gstin, gst_percentage, currency)
VALUES (1, 'Gastronomy POS', '123 Food Street, Culinary City', '+91 98765 43210', '22AAAAA0000A1Z5', 5.00, 'INR')
ON CONFLICT (id) DO NOTHING;

-- Seed Default Categories
INSERT INTO categories (name, description) VALUES
('Starter', 'Appetizers and quick bites'),
('Main Course', 'Hearty main dishes'),
('Beverages', 'Refreshing drinks and mocktails'),
('Desserts', 'Sweet treats to end your meal')
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

-- Create Restaurant Tables Table
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(50) UNIQUE NOT NULL,
    capacity INT DEFAULT 4,
    status VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Dirty'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Tables
INSERT INTO restaurant_tables (table_number, capacity) VALUES
('T-1', 2),
('T-2', 2),
('T-3', 4),
('T-4', 4),
('T-5', 6),
('T-6', 6),
('T-7', 8),
('T-8', 8)
ON CONFLICT (table_number) DO NOTHING;

