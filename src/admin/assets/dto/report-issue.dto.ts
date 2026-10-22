import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUrl } from 'class-validator';

export class ReportIssueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  issue_type!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  image?: string;
}