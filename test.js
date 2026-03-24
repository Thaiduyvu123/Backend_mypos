const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();

bcrypt.hash('admin123', 10).then(async hash => {
  console.log('Hash:', hash);
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.collection('users').updateOne(
    { username: 'superadmin' },
    { $set: { passwordHash: hash } }
  );
  console.log('✅ Cập nhật thành công!');
  await mongoose.disconnect();
});