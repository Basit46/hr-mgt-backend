import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  CATEGORY_STATUSES,
  CategoryStatus,
  DEFAULT_CATEGORY_THRESHOLD,
  resolveCategoryStatus,
} from '../../../common/enums/category-status.enum';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true, versionKey: false })
export class Category {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, min: 0, default: 0 })
  quantity!: number;

  @Prop({ required: true, min: 0, default: DEFAULT_CATEGORY_THRESHOLD })
  threshold!: number;

  @Prop({
    required: true,
    enum: CATEGORY_STATUSES,
    default: CategoryStatus.UNAVAILABLE,
    index: true,
  })
  status!: CategoryStatus;

  @Prop({ trim: true })
  icon_name?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass<Category>(Category);

CategorySchema.pre<CategoryDocument>('save', function () {
  this.status = resolveCategoryStatus(this.quantity, this.threshold);
});
