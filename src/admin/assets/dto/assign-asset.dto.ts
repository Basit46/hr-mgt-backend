import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignAssetDto {
  @IsMongoId()
  asset_id!: string;

  @IsMongoId()
  employee_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  assign_note?: string;
}
