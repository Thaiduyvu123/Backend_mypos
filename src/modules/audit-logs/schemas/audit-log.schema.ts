import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOCK_USER = 'LOCK_USER',
  UNLOCK_USER = 'UNLOCK_USER',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  VIEW = 'VIEW',
  SYNC = 'SYNC',
  EXPORT = 'EXPORT',
}

export enum AuditResource {
  USER = 'USER',
  SHOP = 'SHOP',
  DEVICE = 'DEVICE',
  BUSINESS_TYPE = 'BUSINESS_TYPE',
  AUTH = 'AUTH',
  SYNC = 'SYNC',
}

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  actor_id: string;

  @Prop({ required: true })
  actor_username: string;

  @Prop({ required: true, enum: AuditAction })
  action: string;

  @Prop({ required: true, enum: AuditResource })
  resource: string;

  @Prop()
  resource_id: string;

  @Prop({ type: Object })
  before: Record<string, any>;

  @Prop({ type: Object })
  after: Record<string, any>;

  @Prop()
  ip_address: string;

  @Prop()
  user_agent: string;

  @Prop({ default: true })
  success: boolean;

  @Prop()
  error_message: string;

  @Prop()
  description: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ actor_id: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ resource: 1 });
AuditLogSchema.index({ createdAt: -1 });
