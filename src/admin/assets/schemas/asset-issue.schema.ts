import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type AssetIssueDocument = HydratedDocument<AssetIssue>;

@Schema({ timestamps: true, versionKey: false })
export class AssetIssue {
  @Prop({ required: true, trim: true })
  issue_type!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, default: Date.now })
  reported_date!: Date;

  @Prop({ trim: true })
  image?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Asset',
    required: true,
    index: true,
  })
  asset!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  reported_by!: Types.ObjectId;

  @Prop({ default: false })
  is_resolved!: boolean;

  @Prop({ trim: true })
  resolution_note?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  resolved_by?: Types.ObjectId;

  @Prop()
  resolved_at?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const AssetIssueSchema = SchemaFactory.createForClass<AssetIssue>(AssetIssue);