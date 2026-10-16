import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserType } from '../../common/enums/user-type.enum';

export type UserDocument = HydratedDocument<User>;

export const DEFAULT_AVATAR_SIZE = '128';
const AVATAR_API_BASE_URL = 'https://ui-avatars.com/api/';

export function buildAvatarUrl(firstName: string, lastName: string): string {
  const name = `${firstName} ${lastName}`.trim().replace(/\s+/g, '+');
  return `${AVATAR_API_BASE_URL}?background=0D8ABC&color=fff&size=${DEFAULT_AVATAR_SIZE}&name=${name}`;
}

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, trim: true })
  first_name!: string;

  @Prop({ required: true, trim: true })
  last_name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ select: false })
  password?: string;

  @Prop({
    required: true,
    enum: UserType,
    default: UserType.EMPLOYEE,
    index: true,
  })
  user_type!: UserType;

  @Prop({ trim: true })
  department!: string;

  @Prop({ trim: true })
  role: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  is_email_verified: boolean;

  @Prop({ select: false })
  verification_code: string;

  @Prop({ type: Date, select: false })
  verification_code_expires_at: Date;

  @Prop({ select: false })
  reset_code: string;

  @Prop({ type: Date, select: false })
  reset_code_expires_at: Date;

  @Prop({ trim: true })
  avatar?: string;

  avatar_url: string;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass<User>(User);

UserSchema.virtual('avatar_url').get(function (this: UserDocument) {
  return this.avatar || buildAvatarUrl(this.first_name, this.last_name);
});

UserSchema.pre<UserDocument>('save', function () {
  if (!this.avatar) {
    this.avatar = buildAvatarUrl(this.first_name, this.last_name);
  }
});

UserSchema.pre<UserDocument>('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const result = ret as unknown as Record<string, unknown>;
    delete result.password;
    delete result.verification_code;
    delete result.verification_code_expires_at;
    delete result.reset_code;
    delete result.reset_code_expires_at;
    return result;
  },
});
