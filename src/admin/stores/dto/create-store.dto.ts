import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(200)
  location!: string;

  @IsString()
  @MaxLength(100)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manager_name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  items?: number;
}
