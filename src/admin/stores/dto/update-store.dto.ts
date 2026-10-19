import {
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsProvided } from '../../../common/utils/validate.util';

export class UpdateStoreDto {
  @ValidateIf(IsProvided)
  @IsString()
  @Matches(/\S/, { message: 'name must not be blank' })
  @MaxLength(100)
  name?: string;

  @ValidateIf(IsProvided)
  @IsString()
  @Matches(/\S/, { message: 'location must not be blank' })
  @MaxLength(200)
  location?: string;

  @ValidateIf(IsProvided)
  @IsString()
  @Matches(/\S/, { message: 'state must not be blank' })
  @MaxLength(100)
  state?: string;

  @ValidateIf(IsProvided)
  @IsString()
  @MaxLength(100)
  manager_name?: string;

  @ValidateIf(IsProvided)
  @IsInt()
  @Min(0)
  items?: number;
}
