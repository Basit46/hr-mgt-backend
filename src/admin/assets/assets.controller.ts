import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserType } from '../../common/enums/user-type.enum';
import {
  ASSET_STATUSES,
  AssetStatus,
} from '../../common/enums/asset-status.enum';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AssetsService } from './assets.service';
import { AssetIssueService } from './services/asset-issue.service';
import { AssetDocument } from './schemas/asset.schema';
import { AssetIssueDocument } from './schemas/asset-issue.schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ResolveIssueDto } from './dto/resolve-issue.dto';

@Controller('admin/assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetIssueService: AssetIssueService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Asset created successfully')
  create(
    @Body() createAssetDto: CreateAssetDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AssetDocument> {
    return this.assetsService.create(createAssetDto, currentUser.userId);
  }

  @Get()
  @ResponseMessage('Assets retrieved successfully')
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('category', ParseObjectIdPipe) category?: string,
    @Query('page') page?: string,
    @Query('batch') batch?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<AssetDocument>> {
    this.assertStatus(status);
    return this.assetsService.findAll(
      status as AssetStatus | undefined,
      search,
      category,
      page ?? batch,
      limit,
    );
  }

  @Get('all')
  @ResponseMessage('Assets retrieved successfully')
  async findAllWithoutPagination(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('category', ParseObjectIdPipe) category?: string,
  ): Promise<AssetDocument[]> {
    this.assertStatus(status);
    return this.assetsService.findAllWithoutPagination(
      status as AssetStatus | undefined,
      search,
      category,
    );
  }

  private assertStatus(status?: string): void {
    if (status && !ASSET_STATUSES.includes(status as AssetStatus)) {
      throw new BadRequestException(
        `status must be one of: ${ASSET_STATUSES.join(', ')}`,
      );
    }
  }

  @Get(':id')
  @ResponseMessage('Asset retrieved successfully')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<AssetDocument> {
    return this.assetsService.findOne(id);
  }

  @Get(':id/details')
  @ResponseMessage('Asset details retrieved successfully')
  getDetails(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Record<string, unknown>> {
    return this.assetsService.getDetails(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Asset updated successfully')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ): Promise<AssetDocument> {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Post('assign')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Asset assigned successfully')
  assign(
    @Body() assignAssetDto: AssignAssetDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AssetDocument> {
    return this.assetsService.assign(assignAssetDto, currentUser.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Asset deleted successfully')
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.assetsService.remove(id);
  }

  @Get('issues')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Issues retrieved successfully')
  async findAllIssues(
    @Query('asset', ParseObjectIdPipe) asset?: string,
    @Query('is_resolved') isResolved?: string,
    @Query('issue_type') issueType?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('page') page?: string,
    @Query('batch') batch?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<AssetIssueDocument>> {
    return this.assetIssueService.findAll(
      {
        asset,
        is_resolved: isResolved === 'true' ? true : isResolved === 'false' ? false : undefined,
        issue_type: issueType,
        start_date: startDate,
        end_date: endDate,
      },
      page ?? batch,
      limit,
    );
  }

  @Get('issues/all')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Issues retrieved successfully')
  async findAllIssuesWithoutPagination(
    @Query('asset', ParseObjectIdPipe) asset?: string,
    @Query('is_resolved') isResolved?: string,
    @Query('issue_type') issueType?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<AssetIssueDocument[]> {
    return this.assetIssueService.findAllWithoutPagination({
      asset,
      is_resolved: isResolved === 'true' ? true : isResolved === 'false' ? false : undefined,
      issue_type: issueType,
      start_date: startDate,
      end_date: endDate,
    });
  }

  @Get('issues/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Issue retrieved successfully')
  findIssue(@Param('id', ParseObjectIdPipe) id: string): Promise<AssetIssueDocument> {
    return this.assetIssueService.findById(id);
  }

  @Patch('issues/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Issue resolved successfully')
  async resolveIssue(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ResolveIssueDto,
  ): Promise<AssetIssueDocument> {
    return this.assetIssueService.resolveIssue(id, currentUser.userId, dto);
  }
}
