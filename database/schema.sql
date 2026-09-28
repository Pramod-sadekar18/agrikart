-- ============================================================================
-- AgriKart E-Commerce Platform - MySQL Database Schema & Seed Data
-- Target Database: agrikart_db
-- Compatible with MySQL 5.7+ / 8.0+ / MariaDB 10.3+
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `agrikart_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `agrikart_db`;

-- Disable foreign key checks to allow clean drop & re-creation
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `wishlist_items`;
DROP TABLE IF EXISTS `cart_items`;
DROP TABLE IF EXISTS `user_addresses`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- Table 1: users
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `mobile` VARCHAR(20) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 2: categories
-- ----------------------------------------------------------------------------
CREATE TABLE `categories` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 3: products
-- ----------------------------------------------------------------------------
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category_id` VARCHAR(50) NOT NULL,
  `subcategory` VARCHAR(100) DEFAULT NULL,
  `brand` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `original_price` DECIMAL(10,2) NOT NULL,
  `discount` INT DEFAULT 0,
  `rating` DECIMAL(3,1) DEFAULT 0.0,
  `review_count` INT DEFAULT 0,
  `stock` INT NOT NULL DEFAULT 0,
  `stock_status` VARCHAR(50) NOT NULL DEFAULT 'In Stock',
  `image` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `features` JSON DEFAULT NULL,
  `specifications` JSON DEFAULT NULL,
  `manufacturing_date` DATE DEFAULT '2026-01-15',
  `expiry_date` DATE DEFAULT '2028-01-15',
  `seller` VARCHAR(100) DEFAULT 'AgriKart Fulfilled',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 4: user_addresses
-- ----------------------------------------------------------------------------
CREATE TABLE `user_addresses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` ENUM('Home', 'Work', 'Other') DEFAULT 'Home',
  `name` VARCHAR(100) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `address` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `pincode` VARCHAR(10) NOT NULL,
  `is_default` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 5: cart_items
-- ----------------------------------------------------------------------------
CREATE TABLE `cart_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_cart_product` (`user_id`, `product_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 6: wishlist_items
-- ----------------------------------------------------------------------------
CREATE TABLE `wishlist_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_wishlist_product` (`user_id`, `product_id`),
  CONSTRAINT `fk_wishlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 7: orders
-- ----------------------------------------------------------------------------
CREATE TABLE `orders` (
  `id` VARCHAR(25) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `order_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('Order Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled') DEFAULT 'Order Placed',
  `payment_method` ENUM('cod', 'upi', 'card', 'netbanking') NOT NULL,
  `payment_status` VARCHAR(50) DEFAULT 'Pending (COD)',
  `item_total` DECIMAL(10,2) NOT NULL,
  `mrp_total` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `delivery_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `expected_delivery` DATE DEFAULT NULL,
  `shipping_name` VARCHAR(100) NOT NULL,
  `shipping_mobile` VARCHAR(20) NOT NULL,
  `shipping_address` TEXT NOT NULL,
  `shipping_city` VARCHAR(100) NOT NULL,
  `shipping_state` VARCHAR(100) NOT NULL,
  `shipping_pincode` VARCHAR(10) NOT NULL,
  `shipping_type` VARCHAR(20) DEFAULT 'Home',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 8: order_items
-- ----------------------------------------------------------------------------
CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(25) NOT NULL,
  `product_id` INT NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA: 10 Categories (from js/data.js)
-- ============================================================================
INSERT INTO `categories` (`id`, `name`, `icon`, `description`) VALUES
  ('seeds', 'Seeds', 'bi-flower1', 'High-germination, disease-resistant seeds for every season.'),
  ('fertilizers', 'Fertilizers', 'bi-moisture', 'Balanced nutrition for stronger, healthier crops.'),
  ('pesticides', 'Pesticides', 'bi-bug', 'Effective control against pests that damage your yield.'),
  ('crop-protection', 'Crop Protection', 'bi-shield-check', 'Protect your crops from disease, weather and weeds.'),
  ('farming-tools', 'Farming Tools', 'bi-tools', 'Durable hand tools built for daily farm work.'),
  ('agri-equipment', 'Agricultural Equipment', 'bi-gear-wide-connected', 'Machinery and equipment to scale your operations.'),
  ('irrigation', 'Irrigation', 'bi-droplet', 'Smart water delivery systems for efficient farming.'),
  ('plant-care', 'Plant Care', 'bi-flower3', 'Growth boosters and care essentials for healthy plants.'),
  ('organic', 'Organic Products', 'bi-leaf', '100% organic and chemical-free farming inputs.'),
  ('gardening', 'Gardening Supplies', 'bi-basket3', 'Everything you need for home and kitchen gardens.');

-- ============================================================================
-- SEED DATA: 34 Products (from js/data.js)
-- ============================================================================
INSERT INTO `products` (`id`, `name`, `category_id`, `subcategory`, `brand`, `price`, `original_price`, `discount`, `rating`, `review_count`, `stock`, `stock_status`, `image`, `description`, `features`, `specifications`, `manufacturing_date`, `expiry_date`, `seller`) VALUES
  (1, 'Hybrid Tomato Seeds (50g)', 'seeds', 'Vegetable Seeds', 'AgriGrow', 149, 199, 25, 4.3, 128, 25, 'In Stock', 'assets/images/tomato-seeds.jpg', 'High-yield hybrid tomato seeds suited for tropical and sub-tropical climates.', '["Germination rate 90%+", "Disease resistant", "Suitable for all seasons"]', '{"Weight": "50g", "Type": "Hybrid", "Shelf Life": "12 months"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (2, 'Premium Onion Seeds (100g)', 'seeds', 'Vegetable Seeds', 'FarmFresh', 199, 249, 20, 4.1, 94, 25, 'In Stock', 'assets/images/onion.jpg', 'Long-storage onion variety with uniform bulb size.', '["High yield", "Long storage life", "Uniform size"]', '{"Weight": "100g", "Type": "Open Pollinated"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (3, 'Wheat Seeds HD-2967 (5kg)', 'seeds', 'Grain Seeds', 'KisanBeej', 549, 649, 15, 4.5, 210, 25, 'In Stock', 'assets/images/wheat.jpg', 'Certified wheat seeds with high disease resistance and good grain quality.', '["Rust resistant", "High tillering", "Good grain quality"]', '{"Weight": "5kg", "Variety": "HD-2967"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (4, 'Bt Cotton Seeds (475g)', 'seeds', 'Cash Crop Seeds', 'CottonKing', 799, 899, 11, 4.2, 76, 25, 'In Stock', 'assets/images/cotton.jpg', 'Bollworm resistant Bt cotton seed with strong boll retention.', '["Bollworm resistant", "High fiber quality"]', '{"Pack Size": "475g"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (5, 'Okra (Bhindi) Seeds (250g)', 'seeds', 'Vegetable Seeds', 'AgriGrow', 99, 129, 23, 4.0, 52, 4, 'Only 4 left', 'assets/images/okra.jpg', 'Fast growing okra seeds ideal for home and commercial farming.', '["Fast germination", "High yield"]', '{"Weight": "250g"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (6, 'NPK 19:19:19 Fertilizer (25kg)', 'fertilizers', 'Chemical Fertilizer', 'GrowMax', 1299, 1499, 13, 4.4, 167, 25, 'In Stock', 'assets/images/fertilizer.jpg', 'Balanced water-soluble NPK fertilizer for all crop stages.', '["Water soluble", "Balanced nutrition", "Boosts flowering & fruiting"]', '{"Weight": "25kg", "Type": "Water Soluble"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (7, 'Urea Fertilizer (45kg Bag)', 'fertilizers', 'Chemical Fertilizer', 'IndiaAgri', 266, 299, 11, 4.2, 301, 0, 'Out of Stock', 'assets/images/urea_fertilizer.jpg', 'High nitrogen content urea for vigorous vegetative growth.', '["46% Nitrogen", "Prilled form"]', '{"Weight": "45kg"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (8, 'DAP Fertilizer (50kg)', 'fertilizers', 'Chemical Fertilizer', 'IndiaAgri', 1350, 1450, 7, 4.3, 143, 25, 'In Stock', 'assets/images/DAP_fertilizer.jpg', 'Di-ammonium Phosphate for strong root development.', '["High phosphorus", "Root development"]', '{"Weight": "50kg"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (9, 'Organic Compost (10kg)', 'fertilizers', 'Organic Fertilizer', 'EcoFarm', 349, 399, 13, 4.6, 220, 25, 'In Stock', 'assets/images/compost.jpg', 'Fully decomposed organic compost enriched with micronutrients.', '["100% Organic", "Improves soil health"]', '{"Weight": "10kg"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (10, 'Vermicompost (5kg)', 'organic', 'Organic Fertilizer', 'EcoFarm', 249, 299, 17, 4.5, 188, 4, 'Only 4 left', 'assets/images/Vermicompost.jpg', 'Nutrient-rich vermicompost made from earthworm castings.', '["Rich in micronutrients", "Improves soil texture"]', '{"Weight": "5kg"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (11, 'Neem Oil Concentrate (1L)', 'organic', 'Bio Pesticide', 'NeemPure', 349, 449, 22, 4.4, 159, 25, 'In Stock', 'assets/images/neem.jpg', 'Cold-pressed neem oil, a natural pesticide and fungicide.', '["Cold pressed", "Multi-purpose"]', '{"Volume": "1L"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (12, 'Bio Pesticide Spray (500ml)', 'pesticides', 'Bio Pesticide', 'EcoFarm', 299, 349, 14, 4.1, 88, 25, 'In Stock', 'assets/images/pesticide.jpg', 'Plant-based bio pesticide safe for beneficial insects.', '["Eco-friendly", "Safe for pollinators"]', '{"Volume": "500ml"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (13, 'Chlorpyrifos 20% EC (1L)', 'pesticides', 'Insecticide', 'AgroChem', 449, 529, 15, 4.0, 63, 25, 'In Stock', 'assets/images/Agriculture.jpg', 'Broad spectrum insecticide for effective pest control.', '["Broad spectrum", "Fast acting"]', '{"Volume": "1L"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (14, 'Mancozeb Fungicide (1kg)', 'crop-protection', 'Fungicide', 'AgroChem', 389, 449, 13, 4.2, 74, 0, 'Out of Stock', 'assets/images/fungicide.jpg', 'Protective fungicide against a wide range of fungal diseases.', '["Broad spectrum", "Protective action"]', '{"Weight": "1kg"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (15, 'Glyphosate Weedicide (1L)', 'crop-protection', 'Herbicide', 'WeedOut', 329, 389, 15, 4.0, 55, 4, 'Only 4 left', 'assets/images/weedicide.jpg', 'Systemic herbicide for effective weed control.', '["Systemic action", "Non-selective"]', '{"Volume": "1L"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (16, 'Hand Cultivator (3 Prong)', 'farming-tools', 'Hand Tools', 'FarmPro', 199, 249, 20, 4.3, 142, 25, 'In Stock', 'assets/images/Farming_tool.jpg', 'Sturdy steel hand cultivator for loosening soil and weeding.', '["Rust-resistant steel", "Ergonomic handle"]', '{"Material": "Carbon Steel"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (17, 'Pruning Shears', 'farming-tools', 'Hand Tools', 'FarmPro', 249, 299, 17, 4.5, 201, 25, 'In Stock', 'assets/images/purning.jpg', 'Sharp bypass pruning shears for clean cuts on branches and stems.', '["Sharp SK5 blade", "Non-slip grip"]', '{"Material": "SK5 Steel"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (18, 'Garden Spade', 'farming-tools', 'Hand Tools', 'FarmPro', 349, 399, 13, 4.2, 98, 25, 'In Stock', 'assets/images/spade.jpg', 'Heavy-duty digging spade with a comfortable D-grip handle.', '["Heavy duty", "D-grip handle"]', '{"Material": "Carbon Steel"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (19, 'Manual Seed Sower', 'farming-tools', 'Hand Tools', 'AgriGrow', 449, 549, 18, 4.1, 47, 25, 'In Stock', 'assets/images/seeds.jpg', 'Adjustable manual seed sower for uniform seed spacing.', '["Adjustable spacing", "Lightweight"]', '{"Type": "Manual"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (20, 'Knapsack Agricultural Sprayer (16L)', 'agri-equipment', 'Sprayers', 'AgroTech', 1899, 2299, 17, 4.4, 176, 4, 'Only 4 left', 'assets/images/sprayer.jpg', 'Manual knapsack sprayer with adjustable nozzle for pesticide application.', '["16L capacity", "Adjustable nozzle"]', '{"Capacity": "16L"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (21, 'Battery Operated Sprayer (12L)', 'agri-equipment', 'Sprayers', 'AgroTech', 2999, 3499, 14, 4.3, 112, 0, 'Out of Stock', 'assets/images/fertilizer.jpg', 'Rechargeable battery sprayer for effortless, uniform spraying.', '["Rechargeable battery", "Uniform coverage"]', '{"Capacity": "12L"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (22, 'Brush Cutter (2 Stroke)', 'agri-equipment', 'Power Tools', 'AgroTech', 6499, 7499, 13, 4.2, 84, 25, 'In Stock', 'assets/images/cutter.jpg', 'Powerful 2-stroke brush cutter for clearing grass and weeds.', '["High power engine", "Multiple blade options"]', '{"Engine": "2-Stroke"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (23, 'Mini Power Tiller', 'agri-equipment', 'Machinery', 'AgroTech', 34999, 38999, 10, 4.5, 39, 25, 'In Stock', 'assets/images/equipment.jpg', 'Compact power tiller ideal for small and medium farms.', '["Compact design", "Fuel efficient"]', '{"Type": "Diesel"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (24, 'Drip Irrigation Kit (1 Acre)', 'irrigation', 'Irrigation Kits', 'AquaFarm', 4499, 5499, 18, 4.6, 133, 25, 'In Stock', 'assets/images/drip.jpg', 'Complete drip irrigation kit for efficient water usage.', '["Covers 1 acre", "Water efficient"]', '{"Coverage": "1 Acre"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (25, 'Sprinkler Irrigation Set', 'irrigation', 'Irrigation Kits', 'AquaFarm', 2299, 2699, 15, 4.3, 97, 4, 'Only 4 left', 'assets/images/sprinkler.jpg', 'Rotating sprinkler set for even water distribution.', '["360° rotation", "Easy installation"]', '{"Coverage": "0.5 Acre"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (26, 'Submersible Water Pump (1HP)', 'irrigation', 'Water Pumps', 'AquaFarm', 5499, 6299, 13, 4.4, 71, 25, 'In Stock', 'assets/images/pump.jpg', 'Reliable submersible pump for borewell irrigation.', '["1HP motor", "Corrosion resistant"]', '{"Power": "1HP"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (27, 'Garden Hose Pipe (30m)', 'irrigation', 'Accessories', 'AquaFarm', 699, 849, 18, 4.1, 64, 25, 'In Stock', 'assets/images/hose.jpg', 'Flexible, kink-resistant hose pipe for garden watering.', '["Kink resistant", "UV protected"]', '{"Length": "30m"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (28, 'Plant Growth Booster (500ml)', 'plant-care', 'Growth Promoters', 'GrowMax', 299, 349, 14, 4.3, 119, 0, 'Out of Stock', 'assets/images/plant.jpg', 'Concentrated growth booster for faster, healthier plant growth.', '["Boosts root & shoot growth", "Suitable for all plants"]', '{"Volume": "500ml"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (29, 'Micronutrient Mixture (1kg)', 'plant-care', 'Nutrients', 'GrowMax', 399, 459, 13, 4.2, 88, 25, 'In Stock', 'assets/images/mixture.jpg', 'Balanced micronutrient mix to correct plant deficiencies.', '["Corrects deficiencies", "Improves yield"]', '{"Weight": "1kg"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (30, 'Grafting Wax (200g)', 'plant-care', 'Plant Care', 'FarmPro', 149, 179, 17, 4.0, 34, 4, 'Only 4 left', 'assets/images/wax.jpg', 'Protective wax for grafting and pruning wounds.', '["Waterproof seal", "Promotes healing"]', '{"Weight": "200g"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (31, 'Ceramic Planter Pots (Set of 3)', 'gardening', 'Pots & Planters', 'HomeGrown', 599, 799, 25, 4.5, 152, 25, 'In Stock', 'assets/images/pots.jpg', 'Stylish ceramic planters ideal for home and balcony gardens.', '["Drainage holes", "Weather resistant"]', '{"Set": "3 pieces"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (32, 'Coco Peat Growing Medium (5kg)', 'gardening', 'Growing Media', 'HomeGrown', 249, 299, 17, 4.4, 101, 25, 'In Stock', 'assets/images/peat.jpg', 'Lightweight, water-retentive coco peat block for potting.', '["High water retention", "Eco-friendly"]', '{"Weight": "5kg (compressed)"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (33, 'Garden Gloves (Pack of 2)', 'gardening', 'Accessories', 'HomeGrown', 199, 249, 20, 4.2, 77, 25, 'In Stock', 'assets/images/gloves.jpg', 'Durable, breathable gloves to protect hands while gardening.', '["Breathable fabric", "Reinforced fingertips"]', '{"Pack": "2 pairs"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled'),
  (34, 'Organic Neem Cake Fertilizer (5kg)', 'organic', 'Organic Fertilizer', 'EcoFarm', 329, 379, 13, 4.5, 90, 25, 'In Stock', 'assets/images/cake.jpg', 'Natural soil conditioner and organic pest deterrent.', '["Improves soil fertility", "Repels soil pests"]', '{"Weight": "5kg"}', '2026-01-15', '2028-01-15', 'AgriKart Fulfilled');

-- ============================================================================
-- OPTIONAL DEMO USER & SAMPLE DATA (for instant testing)
-- Demo user password: 'password123' (hashed using standard Werkzeug scrypt)
-- ============================================================================
INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `password_hash`) VALUES
  (1, 'Ramesh Patel', 'farmer@agrikart.com', '9876543210', 'scrypt:32768:8:1$xP5L1i4vXQz0$cb1cb894d378eead141c2c366ff42c23ae31f0840c5f2ceaa077e682d3856b3e77868516629ae6bf81938b81fa3d1830bb4dcfceaa23326164d1f2e143fa92e6');

INSERT INTO `user_addresses` (`id`, `user_id`, `type`, `name`, `mobile`, `address`, `city`, `state`, `pincode`, `is_default`) VALUES
  (1, 1, 'Home', 'Ramesh Patel', '9876543210', 'Plot No. 42, Green Farm Road', 'Nashik', 'Maharashtra', '422003', TRUE);

INSERT INTO `orders` (`id`, `user_id`, `status`, `payment_method`, `payment_status`, `item_total`, `mrp_total`, `discount`, `delivery_charges`, `tax`, `total_amount`, `expected_delivery`, `shipping_name`, `shipping_mobile`, `shipping_address`, `shipping_city`, `shipping_state`, `shipping_pincode`, `shipping_type`) VALUES
  ('AGK84920194', 1, 'Confirmed', 'cod', 'Pending (COD)', 498.00, 598.00, 100.00, 49.00, 25.00, 572.00, DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'Ramesh Patel', '9876543210', 'Plot No. 42, Green Farm Road', 'Nashik', 'Maharashtra', '422003', 'Home');

INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `unit_price`, `quantity`, `total_price`) VALUES
  ('AGK84920194', 1, 'Hybrid Tomato Seeds (50g)', 149.00, 2, 298.00),
  ('AGK84920194', 10, 'Vermicompost (5kg)', 249.00, 1, 249.00);
