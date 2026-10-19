import {
  IsMongoId,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsProvided } from '../../../common/utils/validate.util';

export class UpdateAssetDto {
  @ValidateIf(IsProvided)
  @IsString()
  @Matches(/\S/, { message: 'asset_name must not be blank' })
  @MaxLength(100)
  asset_name?: string;

  @ValidateIf(IsProvided)
  @IsString()
  @Matches(/\S/, { message: 'serial_no must not be blank' })
  @MaxLength(100)
  serial_no?: string;

  @ValidateIf(IsProvided)
  @IsString()
  @MaxLength(100)
  generation?: string;

  @ValidateIf(IsProvided)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ValidateIf(IsProvided)
  @IsString()
  @MaxLength(500)
  image?: string;

  @ValidateIf(IsProvided)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ValidateIf(IsProvided)
  @IsMongoId()
  store?: string;

  @ValidateIf(IsProvided)
  @IsMongoId()
  category?: string;
}
