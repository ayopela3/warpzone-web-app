import bcrypt from 'bcryptjs';

// Generate password hashes for seeded accounts
const adminPassword = 'Admin@123';
const sellerPassword = 'Seller@123';

const adminHash = bcrypt.hashSync(adminPassword, 10);
const sellerHash = bcrypt.hashSync(sellerPassword, 10);

console.log('Admin password hash:', adminHash);
console.log('Seller password hash:', sellerHash);

// Generate UUIDs for the users
const adminId = crypto.randomUUID();
const sellerId = crypto.randomUUID();

console.log('Admin ID:', adminId);
console.log('Seller ID:', sellerId);
