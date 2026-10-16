import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  STORE_STATUSES,
  StoreStatus,
} from '../../../common/enums/store-status.enum';

export type StoreDocument = HydratedDocument<Store>;

@Schema({ timestamps: true, versionKey: false })
export class Store {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  location!: string;

  @Prop({ required: true, trim: true, index: true })
  state!: string;

  @Prop({ trim: true })
  manager_name?: string;

  @Prop({ required: true, min: 0, default: 0 })
  items!: number;

  @Prop({
    required: true,
    enum: STORE_STATUSES,
    default: StoreStatus.ACTIVE,
    index: true,
  })
  status!: StoreStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const StoreSchema = SchemaFactory.createForClass<Store>(Store);
