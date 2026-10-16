import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserType } from '../../common/enums/user-type.enum';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  first_name!: string;

  @IsString()
  @MinLength(2)
  last_name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(UserType)
  user_type!: UserType;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
