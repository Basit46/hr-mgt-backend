import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveIssueDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolution_note?: string;
}