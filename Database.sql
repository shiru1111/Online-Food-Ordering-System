-- Drop and create fresh database
DROP DATABASE IF EXISTS food_ordering;
CREATE DATABASE food_ordering;
USE food_ordering;

-- Users table
CREATE TABLE users (
  email VARCHAR(100) PRIMARY KEY
);

-- Restaurants table
CREATE TABLE restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- Menus table
CREATE TABLE menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  restaurant_id INT,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Orders table
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(100),
  restaurant_id INT,
  status VARCHAR(50),
  tracking_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_email) REFERENCES users(email),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Order Items table
CREATE TABLE order_items (
  order_id INT,
  menu_id INT,
  quantity INT DEFAULT 1,
  PRIMARY KEY (order_id, menu_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
);

-- Insert restaurants
INSERT INTO restaurants (name) VALUES 
('Mang Inasal'),
('Jollibee'),
('Chowking'),
('Borgir King'),
('KFC'),
('Mcdo'),
('Wolfgang Steak House'),
('Diwata Pares');

-- Insert menu items
INSERT INTO menus (name, price, restaurant_id) VALUES
-- Mang Inasal
('Chicken Inasal(Pecho)', 145.00, 1),
('Chicken Inasal (Paa)', 130.00, 1),
('Pork BBQ', 105.00, 1),
('Bangus Sisig', 120.00, 1),
('Pork Sisig', 115.00, 1),
('Palabok', 65.00, 1),
('Chicken Empanada', 40.00, 1),
('Halo-Halo', 55.00, 1),
('Iced Gulaman', 35.00, 1),
-- Jollibee
('Chickenjoy', 89.00, 2),
('Jolly Spaghetti', 60.00, 2),
('Burger Steak (1-pc)', 55.00, 2),
('Yumburger', 40.00, 2),
('Jolly Hotdog', 60.00, 2),
('Tuna Pie', 45.00, 2),
('Palabok Fiesta', 90.00, 2),
('Jolly Crispy Fries', 40.00, 2),
('Jolly Sundae', 30.00, 2),
('Peach Mango Pie', 39.00, 2),
-- Chowking
('Chao Fan', 70.00, 3),
('Chinese Fried Chicken', 120.00, 3),
('Siomai (4 pcs)', 50.00, 3),
('Lumpiang Shanghai', 70.00, 3),
('Beef Mami', 90.00, 3),
('Wonton Soup', 65.00, 3),
('Pancit Canton', 80.00, 3),
('Sweet & Sour Pork', 130.00, 3),
('Buchi', 45.00, 3),
('Halo-Halo Supreme', 90.00, 3),
-- Burger King
('Whopper', 180.00, 4),
('4-Cheese Whopper', 219.00, 4),
('Cheeseburger', 60.00, 4),
('BK King Box', 189.00, 4),
('X-Tra Long Chicken', 135.00, 4),
('Chicken Nuggets (6)', 85.00, 4),
('Onion Rings (Med)', 65.00, 4),
('Mocha BK Joe', 55.00, 4),
('Hershey’s Sundae Pie', 95.00, 4),
('BBQ Bacon King', 220.00, 4),
-- KFC
('1-pc Chicken Meal', 105.00, 5),
('Famous Bowl', 99.00, 5),
('Zinger Burger', 135.00, 5),
('Twister Wrap', 99.00, 5),
('Chicken Chops', 70.00, 5),
('Mashed Potato', 45.00, 5),
('Mac & Cheese', 50.00, 5),
('Krushers', 65.00, 5),
('Bucket of Chicken (6)', 525.00, 5),
('Coleslaw', 40.00, 5),
-- McDonald's
('Chicken McDo (1-pc)', 105.00, 6),
('Burger McDo', 40.00, 6),
('McSpaghetti', 65.00, 6),
('Big Mac', 199.00, 6),
('Cheeseburger', 65.00, 6),
('McChicken Sandwich', 135.00, 6),
('McNuggets (6 pcs)', 105.00, 6),
('BFF Fries', 80.00, 6),
('Apple Pie', 40.00, 6),
('McFloat', 49.00, 6),
-- Wolfgang Steakhouse
('Porterhouse Steak', 4800.00, 7),
('Rib Eye Steak', 4200.00, 7),
('Filet Mignon', 3500.00, 7),
('Prime NY Sirloin', 3900.00, 7),
('Grilled Salmon', 1800.00, 7),
('Lobster Mac & Cheese', 1200.00, 7),
('Crab Cake', 950.00, 7),
('Creamed Spinach', 450.00, 7),
('Mashed Potatoes', 400.00, 7),
('Cheesecake', 550.00, 7),
-- Diwata Pares
('Beef Pares', 80.00, 8),
('Pares Mami', 95.00, 8),
('Pares Overload', 120.00, 8),
('Garlic Fried Rice', 30.00, 8),
('Tokwa’t Baboy', 60.00, 8),
('Sisig', 85.00, 8),
('Bulalo', 160.00, 8),
('Lechon Kawali', 110.00, 8),
('Pancit Canton', 70.00, 8),
('Tapsilog', 95.00, 8);

-- Select menu items for checking
UPDATE menus SET price = 99 WHERE price IS NULL;
ALTER TABLE menus MODIFY price DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD customer_name VARCHAR(100);
ALTER TABLE orders ADD payment_method VARCHAR(50);
ALTER TABLE orders ADD account_number VARCHAR(100);
ALTER TABLE orders ADD house_number VARCHAR(100);
ALTER TABLE orders ADD city VARCHAR(100);
ALTER TABLE orders ADD province VARCHAR(100);
ALTER TABLE orders ADD postal_code VARCHAR(20);
ALTER TABLE orders ADD additional_address TEXT;

-- Add columns to users table
ALTER TABLE users ADD COLUMN password VARCHAR(255);
ALTER TABLE users ADD COLUMN level INT DEFAULT 1;
INSERT INTO users (email, password, level) VALUES ('user@gmail.com', 'user', 1);
INSERT INTO users (email, password, level) VALUES ('admin@gmail.com', 'admin', 2);
