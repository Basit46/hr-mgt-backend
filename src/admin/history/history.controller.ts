import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ASSET_ACTIVITY_TYPES,
  AssetActivityType,
} from '../../common/enums/asset-activity-type.enum';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserType } from '../../common/enums/user-type.enum';
import { HistoryFilters, HistoryService, AdminRecordActivityInput } from './history.service';
import { AssetHistoryDocument } from './schemas/asset-history.schema';

@Controller('admin/history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Post()
  @ResponseMessage('Activity recorded successfully')
  async recordActivity(
    @Body() input: AdminRecordActivityInput,
  ): Promise<AssetHistoryDocument> {
    return this.historyService.adminRecordActivity(input);
  }

  @Get()
  @ResponseMessage('History retrieved successfully')
  async findAll(
    @Query('asset', ParseObjectIdPipe) asset?: string,
    @Query('event_type') eventType?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('batch') batch?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<AssetHistoryDocument>> {
    return this.historyService.findAll(
      this.buildFilters(asset, eventType, department, search),
      page ?? batch,
      limit,
    );
  }

  @Get('all')
  @ResponseMessage('History retrieved successfully')
  async findAllWithoutPagination(
    @Query('asset', ParseObjectIdPipe) asset?: string,
    @Query('event_type') eventType?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
  ): Promise<AssetHistoryDocument[]> {
    return this.historyService.findAllWithoutPagination(
      this.buildFilters(asset, eventType, department, search),
    );
  }

  @Get(':id')
  @ResponseMessage('History entry retrieved successfully')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<AssetHistoryDocument> {
    return this.historyService.findOne(id);
  }

  private buildFilters(
    asset?: string,
    eventType?: string,
    department?: string,
    search?: string,
  ): HistoryFilters {
    if (
      eventType &&
      !ASSET_ACTIVITY_TYPES.includes(eventType as AssetActivityType)
    ) {
      throw new BadRequestException(
        `event_type must be one of: ${ASSET_ACTIVITY_TYPES.join(', ')}`,
      );
    }

    return {
      asset,
      eventType: eventType as AssetActivityType | undefined,
      department,
      search,
    };
  }
}
