import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  asset_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serial_no?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  generation?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsMongoId()
  store?: string;

  @IsOptional()
  @IsMongoId()
  category?: string;
}
