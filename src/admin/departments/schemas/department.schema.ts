import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DepartmentDocument = HydratedDocument<Department>;

@Schema({ timestamps: true, versionKey: false })
export class Department {
  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  createdAt: Date;
  updatedAt: Date;
}

export const DepartmentSchema =
  SchemaFactory.createForClass<Department>(Department);
