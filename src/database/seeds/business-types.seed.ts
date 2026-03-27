import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

const BUSINESS_TYPES = [
  // Ẩm thực
  { name: 'Quán ăn / Nhà hàng',      nameEn: 'Restaurant',          icon: '🍜', sortOrder: 1  },
  { name: 'Cà phê / Trà sữa',        nameEn: 'Cafe & Tea',           icon: '☕', sortOrder: 2  },
  { name: 'Bánh & Dessert',           nameEn: 'Bakery & Dessert',     icon: '🍰', sortOrder: 3  },
  { name: 'Đồ ăn nhanh',             nameEn: 'Fast Food',            icon: '🍔', sortOrder: 4  },
  { name: 'Bar / Pub',               nameEn: 'Bar & Pub',            icon: '🍺', sortOrder: 5  },
  // Bán lẻ
  { name: 'Tạp hóa / Siêu thị mini', nameEn: 'Grocery Store',        icon: '🛒', sortOrder: 10 },
  { name: 'Thời trang',              nameEn: 'Fashion & Clothing',   icon: '👗', sortOrder: 11 },
  { name: 'Điện tử / Điện máy',      nameEn: 'Electronics',          icon: '📱', sortOrder: 12 },
  { name: 'Nhà thuốc / Dược phẩm',   nameEn: 'Pharmacy',             icon: '💊', sortOrder: 13 },
  { name: 'Mỹ phẩm / Làm đẹp',      nameEn: 'Cosmetics & Beauty',   icon: '💄', sortOrder: 14 },
  { name: 'Sách / Văn phòng phẩm',   nameEn: 'Books & Stationery',   icon: '📚', sortOrder: 15 },
  { name: 'Thể thao / Fitness',      nameEn: 'Sports & Fitness',     icon: '⚽', sortOrder: 16 },
  { name: 'Thú cưng',                nameEn: 'Pet Store',            icon: '🐾', sortOrder: 17 },
  { name: 'Hoa & Quà tặng',          nameEn: 'Flowers & Gifts',      icon: '💐', sortOrder: 18 },
  // Dịch vụ
  { name: 'Spa / Nail / Massage',    nameEn: 'Spa & Wellness',       icon: '💆', sortOrder: 20 },
  { name: 'Tóc / Barber',            nameEn: 'Hair Salon',           icon: '✂️', sortOrder: 21 },
  { name: 'Khách sạn / Nhà nghỉ',    nameEn: 'Hotel & Hostel',       icon: '🏨', sortOrder: 22 },
  { name: 'Giặt ủi',                 nameEn: 'Laundry',              icon: '👕', sortOrder: 23 },
  { name: 'Sửa chữa / Bảo dưỡng',   nameEn: 'Repair Service',       icon: '🔧', sortOrder: 24 },
  { name: 'Giáo dục / Trung tâm',    nameEn: 'Education Center',     icon: '🎓', sortOrder: 25 },
  { name: 'Phòng khám / Y tế',       nameEn: 'Clinic & Medical',     icon: '🏥', sortOrder: 26 },
  { name: 'Gym / Yoga',              nameEn: 'Gym & Fitness',        icon: '🏋️', sortOrder: 27 },
  { name: 'Bãi xe / Rửa xe',         nameEn: 'Parking & Car Wash',   icon: '🚗', sortOrder: 28 },
  // Khác
  { name: 'Khác',                    nameEn: 'Other',                icon: '🏪', sortOrder: 99 },
];

async function seed() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/mydb';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Kết nối MongoDB thành công');

    const db = client.db();
    const collection = db.collection('businesstypes');

    // Kiểm tra đã seed chưa (tránh duplicate)
    const existing = await collection.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Đã có ${existing} loại hình kinh doanh trong DB. Bỏ qua seed.`);
      console.log('   Nếu muốn seed lại, xóa collection businesstypes trước.');
      return;
    }

    // Tạo mới với UUID
    const docs = BUSINESS_TYPES.map((type) => ({
      _id: `bt_${randomUUID()}`,   // ✅ UUID nhất quán
      ...type,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await collection.insertMany(docs as any);

    console.log(`✅ Seed hoàn tất: ${docs.length} loại hình kinh doanh`);
    docs.forEach((d) => console.log(`   ${d.icon}  ${d.name} → ${d._id}`));
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await client.close();
    console.log('🔌 Đã đóng kết nối');
  }
}

seed();
