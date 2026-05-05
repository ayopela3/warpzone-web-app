-- Insert seeded admin account
INSERT OR IGNORE INTO users (id, email, password_hash, created_at)
VALUES (
  '9127bd51-d8d9-449c-a7eb-b85e0631a497',
  'admin@warpzone.com',
  '$2b$10$KLHFfzC3GZuYAVSBqzRasOvaSPl927YbeuXoXDLELWo33sFAkd7N6',
  datetime('now')
);

-- Insert seeded shop owner account
INSERT OR IGNORE INTO users (id, email, password_hash, created_at)
VALUES (
  '56f6605c-1631-415a-af04-560cd69445d2',
  'seller@warpzone.com',
  '$2b$10$xG6foB.k4av1prpSgaIGWeIeM89LKM5qJhrC0CRpCggwFG.tiwGVe',
  datetime('now')
);

-- Insert admin profile
INSERT OR IGNORE INTO profiles (id, user_id, full_name, street, city, province, country, zip_code, phone_number, role, profile_picture, business_name, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '9127bd51-d8d9-449c-a7eb-b85e0631a497',
  'Warpzone Admin',
  '123 Admin Street',
  'Metro Manila',
  'NCR',
  'Philippines',
  '1234',
  '+639123456789',
  'admin',
  NULL,
  'Warpzone',
  datetime('now'),
  datetime('now')
);

-- Insert seller profile
INSERT OR IGNORE INTO profiles (id, user_id, full_name, street, city, province, country, zip_code, phone_number, role, profile_picture, business_name, created_at, updated_at)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  '56f6605c-1631-415a-af04-560cd69445d2',
  'Warpzone Seller',
  '456 Seller Avenue',
  'Quezon City',
  'NCR',
  'Philippines',
  '5678',
  '+639987654321',
  'seller',
  NULL,
  'Warpzone Shop',
  datetime('now'),
  datetime('now')
);
