import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument, AuditAction, AuditResource } from './schemas/audit-log.schema';

export interface CreateAuditLogDto {
  actor_id: string;
  actor_username: string;
  action: AuditAction;
  resource: AuditResource;
  resource_id?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  success?: boolean;
  error_message?: string;
  description?: string;
}

export interface AuditLogFilter {
  actor_id?: string;
  action?: string;
  resource?: string;
  success?: boolean;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    const log = new this.auditLogModel(dto);
    return log.save();
  }

  async findAll(filter: AuditLogFilter) {
    const {
      actor_id,
      action,
      resource,
      success,
      from_date,
      to_date,
      page = 1,
      limit = 20,
    } = filter;

    const query: any = {};

    if (actor_id) query.actor_id = actor_id;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (success !== undefined) query.success = success;

    if (from_date || to_date) {
      query.createdAt = {};
      if (from_date) query.createdAt.$gte = new Date(from_date);
      if (to_date) query.createdAt.$lte = new Date(to_date);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(query),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.auditLogModel.findById(id).lean().exec();
  }

  async getStats() {
    const [actionStats, resourceStats, recentFailures] = await Promise.all([
      this.auditLogModel.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.auditLogModel.aggregate([
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.auditLogModel
        .find({ success: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return { actionStats, resourceStats, recentFailures };
  }
}
