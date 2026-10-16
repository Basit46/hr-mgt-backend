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
  CATEGORY_STATUSES,
  CategoryStatus,
} from '../../common/enums/category-status.enum';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Category created successfully')
  create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryDocument> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ResponseMessage('Categories retrieved successfully')
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('batch') batch?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<CategoryDocument>> {
    this.assertStatus(status);
    return this.categoriesService.findAll(
      status as CategoryStatus | undefined,
      search,
      page ?? batch,
      limit,
    );
  }

  @Get('all')
  @ResponseMessage('Categories retrieved successfully')
  async findAllWithoutPagination(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<CategoryDocument[]> {
    this.assertStatus(status);
    return this.categoriesService.findAllWithoutPagination(
      status as CategoryStatus | undefined,
      search,
    );
  }

  private assertStatus(status?: string): void {
    if (status && !CATEGORY_STATUSES.includes(status as CategoryStatus)) {
      throw new BadRequestException(
        `status must be one of: ${CATEGORY_STATUSES.join(', ')}`,
      );
    }
  }

  @Get(':id')
  @ResponseMessage('Category retrieved successfully')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<CategoryDocument> {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Category updated successfully')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryDocument> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Category deleted successfully')
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
