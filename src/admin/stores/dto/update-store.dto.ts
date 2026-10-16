import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manager_name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  items?: number;
}
