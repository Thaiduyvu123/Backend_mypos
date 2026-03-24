import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Device, DeviceDocument } from './schemas/devices.schema';

const MAX_DEVICES_PER_USER = 1;

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,
  ) {}

  async registerDevice(
    userId: string,
    deviceInfo: {
      deviceName?: string;
      platform?: string;
      appVersion?: string;
      userAgent?: string;
    },
  ): Promise<Device> {
    const activeDevices = await this.deviceModel
      .find({ userId, isActive: true })
      .sort({ lastActiveAt: 1 })
      .exec();

    if (activeDevices.length >= MAX_DEVICES_PER_USER) {
      const oldestDevice = activeDevices[0];
      await this.deviceModel.findByIdAndUpdate(oldestDevice._id, {
        isActive: false,
        loggedOutAt: new Date(),
      });
      this.logger.log(
        `Auto logout: ${oldestDevice.deviceName} - user ${userId}`,
      );
    }

    const newDevice = await this.deviceModel.create({
      _id: `device_${randomUUID()}`,
      userId,
      deviceName: deviceInfo.deviceName ?? 'Unknown Device',
      platform: deviceInfo.platform ?? 'web',
      appVersion: deviceInfo.appVersion ?? '1.0.0',
      userAgent: deviceInfo.userAgent ?? '',
      isActive: true,
      lastActiveAt: new Date(),
    });

    return newDevice;
  }

  async logoutDevice(deviceId: string): Promise<void> {
    await this.deviceModel.findByIdAndUpdate(deviceId, {
      isActive: false,
      loggedOutAt: new Date(),
    });
  }

  async getActiveDevices(userId: string): Promise<Device[]> {
    return this.deviceModel.find({ userId, isActive: true }).exec();
  }

  async updateLastActive(deviceId: string): Promise<void> {
    await this.deviceModel.findByIdAndUpdate(deviceId, {
      lastActiveAt: new Date(),
    });
  }
}
