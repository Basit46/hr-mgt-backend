import {
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsProvided } from '../../../common/utils/validate.util';

export class UpdateCategoryDto {
  @ValidateIf(IsProvided)
  @IsString()
  @Matches(/\S/, { message: 'name must not be blank' })
  @MaxLength(100)
  name?: string;

  @ValidateIf(IsProvided)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ValidateIf(IsProvided)
  @IsInt()
  @Min(0)
  quantity?: number;

  @ValidateIf(IsProvided)
  @IsInt()
  @Min(0)
  threshold?: number;

  @ValidateIf(IsProvided)
  @IsString()
  @MaxLength(100)
  icon_name?: string;
}
