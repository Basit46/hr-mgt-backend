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
  STORE_STATUSES,
  StoreStatus,
} from '../../common/enums/store-status.enum';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { StoresService } from './stores.service';
import { StoreDocument } from './schemas/store.schema';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Controller('admin/stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Store created successfully')
  create(@Body() createStoreDto: CreateStoreDto): Promise<StoreDocument> {
    return this.storesService.create(createStoreDto);
  }

  @Get()
  @ResponseMessage('Stores retrieved successfully')
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('batch') batch?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<StoreDocument>> {
    this.assertStatus(status);
    return this.storesService.findAll(
      status as StoreStatus | undefined,
      search,
      page ?? batch,
      limit,
    );
  }

  @Get('all')
  @ResponseMessage('Stores retrieved successfully')
  async findAllWithoutPagination(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<StoreDocument[]> {
    this.assertStatus(status);
    return this.storesService.findAllWithoutPagination(
      status as StoreStatus | undefined,
      search,
    );
  }

  private assertStatus(status?: string): void {
    if (status && !STORE_STATUSES.includes(status as StoreStatus)) {
      throw new BadRequestException(
        `status must be one of: ${STORE_STATUSES.join(', ')}`,
      );
    }
  }

  @Get(':id')
  @ResponseMessage('Store retrieved successfully')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<StoreDocument> {
    return this.storesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Store updated successfully')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateStoreDto: UpdateStoreDto,
  ): Promise<StoreDocument> {
    return this.storesService.update(id, updateStoreDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Store deleted successfully')
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.storesService.remove(id);
  }
}
