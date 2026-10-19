import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import {
  ASSET_STATUSES,
  AssetStatus,
} from '../../../common/enums/asset-status.enum';

export type AssetDocument = HydratedDocument<Asset>;

@Schema({ _id: false })
export class AssetAssignment {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  employee!: Types.ObjectId;

  @Prop({ required: true })
  assignedAt!: Date;

  @Prop({ trim: true })
  assign_note?: string;
}

export const AssetAssignmentSchema =
  SchemaFactory.createForClass<AssetAssignment>(AssetAssignment);

@Schema({ timestamps: true, versionKey: false })
export class Asset {
  @Prop({ required: true, trim: true })
  asset_name!: string;

  @Prop({ required: true, unique: true, trim: true })
  serial_no!: string;

  @Prop({ trim: true })
  generation?: string;

  @Prop({ min: 0 })
  cost?: number;

  @Prop({ trim: true })
  image?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true,
  })
  store!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  category!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ASSET_STATUSES,
    default: AssetStatus.AVAILABLE,
    index: true,
  })
  status!: AssetStatus;

  @Prop({ type: AssetAssignmentSchema })
  assignedTo?: AssetAssignment;

  createdAt: Date;
  updatedAt: Date;
}

export const AssetSchema = SchemaFactory.createForClass<Asset>(Asset);

AssetSchema.pre<AssetDocument>('save', function () {
  if (this.assignedTo?.employee) {
    this.status = AssetStatus.UNAVAILABLE;
  }
});
