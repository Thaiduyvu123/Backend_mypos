import { Injectable, Logger } from '@nestjs/common';

export interface GeoCoordinates {
  lat: number | null;
  lng: number | null;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  /**
   * Lấy lat/lng từ địa chỉ bằng Nominatim (OpenStreetMap)
   * Hỗ trợ địa chỉ của mọi quốc gia
   *
   * @param address   Số nhà, tên đường
   * @param city      Thành phố / tỉnh
   * @param country   Tên quốc gia (tiếng Anh hoặc tiếng bản địa)
   */
  async getCoordinates(
    address: string,
    city: string,
    country: string,
  ): Promise<GeoCoordinates> {
    // Ghép địa chỉ đầy đủ để Nominatim tìm kiếm chính xác hơn
    const fullAddress = [address, city, country]
      .filter(Boolean)
      .join(', ');

    // Encode để dùng trong URL
    const encodedAddress = encodeURIComponent(fullAddress);

    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodedAddress}` +
      `&format=json` +
      `&limit=1` +
      `&addressdetails=1`;

    try {
      this.logger.log(`Geocoding: "${fullAddress}"`);

      const response = await fetch(url, {
        headers: {
          // Nominatim yêu cầu User-Agent để tránh bị block
          'User-Agent': 'My1POS-App/1.0 (contact@my1pos.com)',
          'Accept-Language': 'en', // Trả về tên địa danh bằng tiếng Anh
        },
      });

      if (!response.ok) {
        this.logger.warn(`Nominatim HTTP error: ${response.status}`);
        return { lat: null, lng: null };
      }

      const data = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (!data || data.length === 0) {
        this.logger.warn(`Không tìm thấy toạ độ cho: "${fullAddress}"`);
        return { lat: null, lng: null };
      }

      const { lat, lon, display_name } = data[0];
      this.logger.log(`Tìm thấy: ${display_name} → (${lat}, ${lon})`);

      return {
        lat: parseFloat(lat),
        lng: parseFloat(lon),
      };
    } catch (error) {
      this.logger.error(`Lỗi geocoding: ${(error as Error).message}`);
      return { lat: null, lng: null };
    }
  }
}
