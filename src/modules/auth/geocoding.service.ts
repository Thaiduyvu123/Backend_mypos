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
  `https://us1.locationiq.com/v1/search` +
  `?key=${process.env.LOCATIONIQ_API_KEY}` +
  `&q=${encodedAddress}` +
  `&format=json` +
  `&limit=1` +
  `&countrycodes=vn` +
  `&addressdetails=1`;

    try {
      this.logger.log(`Geocoding: "${fullAddress}"`);

      const response = await fetch(url, {
        headers: {
  'Accept-Language': 'vi',
},
      });

      if (!response.ok) {
        this.logger.warn(`LocationIQ HTTP error: ${response.status}`);
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
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);

        // Ràng buộc tọa độ phải nằm trong lãnh thổ Việt Nam
        const inVietnam =
          latNum >= 8.0 && latNum <= 23.5 &&
          lngNum >= 102.0 && lngNum <= 110.0;

        if (!inVietnam) {
          this.logger.warn(`Tọa độ ngoài VN: (${latNum}, ${lngNum}) — "${fullAddress}"`);
          return { lat: null, lng: null };
        }

        this.logger.log(`Tìm thấy: ${display_name} → (${latNum}, ${lngNum})`);
        return { lat: latNum, lng: lngNum };
    } catch (error) {
      this.logger.error(`Lỗi geocoding: ${(error as Error).message}`);
      return { lat: null, lng: null };
    }
  }
}
