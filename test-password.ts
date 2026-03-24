/**
 * Test so sánh password với hash trong MongoDB
 * Usage: npx ts-node test-password.ts <mongoUri> <username> <plainPassword>
 * Example: npx ts-node test-password.ts "mongodb://localhost:27017/mydb" "admin" "123456"
 */

import { MongoClient, Document } from 'mongodb';
import * as bcrypt from 'bcrypt';

interface UserDocument extends Document {
  _id: string;
  username: string;
  passwordHash: string;
  shopId?: string;
  fullName?: string;
  role?: string;
  isActive?: boolean;
}

async function testPassword(
  mongoUri: string,
  username: string,
  plainPassword: string,
): Promise<boolean> {
  console.log('📌 mongoUri  :', mongoUri);
  console.log('📌 username  :', username);
  console.log('📌 password  :', plainPassword);
  console.log('-----------------------------------');

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Kết nối MongoDB thành công');

    // Lấy tên database từ URI
    const dbName = mongoUri.split('/').pop()?.split('?')[0] ?? 'mydb';
    console.log('📦 Database  :', dbName);

    const db = client.db(dbName);

    // List tất cả collections để debug
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections:', collections.map((c) => c.name));

    // Tìm user trong tất cả collections
    let user: UserDocument | null = null;

    for (const col of collections) {
      const found = await db
        .collection<UserDocument>(col.name)
        .findOne({ username });

      if (found) {
        user = found;
        console.log(`✅ Tìm thấy user trong collection: "${col.name}"`);
        break;
      }
    }

    if (!user) {
      console.log(
        `❌ Không tìm thấy user: "${username}" trong bất kỳ collection nào`,
      );
      return false;
    }

    console.log('👤 User data :', JSON.stringify(user, null, 2));

    if (!user.passwordHash) {
      console.log('❌ User không có field "passwordHash"');
      return false;
    }

    // So sánh password
    const isMatch: boolean = await bcrypt.compare(
      plainPassword,
      user.passwordHash,
    );

    console.log('-----------------------------------');
    console.log(`🔍 Kết quả: ${isMatch}`);
    console.log(isMatch ? '✅ Password ĐÚNG' : '❌ Password SAI');

    return isMatch;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await client.close();
    console.log('🔌 Đã đóng kết nối MongoDB');
  }
}

const [, , mongoUri, username, plainPassword] = process.argv;

if (!mongoUri || !username || !plainPassword) {
  console.log('⚠️  Thiếu tham số!');
  console.log(
    'Usage  : npx ts-node test-password.ts <mongoUri> <username> <plainPassword>',
  );
  console.log(
    'Example: npx ts-node test-password.ts "mongodb://localhost:27017/mydb" "admin" "123456"',
  );
  process.exit(1);
}

testPassword(mongoUri, username, plainPassword)
  .then((result: boolean) => {
    console.log(`\nOutput: ${result}`);
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });