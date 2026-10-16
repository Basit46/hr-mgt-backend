import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import {
  ASSET_ACTIVITY_TYPES,
  AssetActivityType,
} from '../../../common/enums/asset-activity-type.enum';

export type AssetHistoryDocument = HydratedDocument<AssetHistory>;

@Schema({ timestamps: true, versionKey: false })
export class AssetHistory {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Asset',
    required: true,
    index: true,
  })
  asset!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ASSET_ACTIVITY_TYPES,
    index: true,
  })
  event_type!: AssetActivityType;

  @Prop({ required: true, min: 0 })
  quantity!: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  performed_by!: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const AssetHistorySchema =
  SchemaFactory.createForClass<AssetHistory>(AssetHistory);
