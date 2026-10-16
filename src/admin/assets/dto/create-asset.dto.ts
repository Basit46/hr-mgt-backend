import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @MaxLength(100)
  asset_name!: string;

  @IsString()
  @MaxLength(100)
  serial_no!: string;

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

  @IsMongoId()
  store!: string;

  @IsMongoId()
  category!: string;
}
