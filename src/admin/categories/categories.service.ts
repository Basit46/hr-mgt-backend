import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { CategoryStatus } from '../../common/enums/category-status.enum';
import { buildSearchRegex } from '../../common/utils/search.util';
import { parsePagination } from '../../common/utils/pagination.util';
import { definedEntries } from '../../common/utils/assign.util';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryDocument> {
    const existing = await this.categoryModel
      .findOne({ name: createCategoryDto.name })
      .exec();

    if (existing) {
      throw new ConflictException('Category already exists');
    }

    return this.categoryModel.create(createCategoryDto);
  }

  private buildFilter(status?: CategoryStatus, search?: string) {
    const filter: QueryFilter<CategoryDocument> = {};

    if (status) {
      filter.status = status;
    }

    if (search?.trim()) {
      const regex = buildSearchRegex(search);
      filter.$or = [{ name: regex }, { description: regex }];
    }

    return filter;
  }

  async findAll(
    status?: CategoryStatus,
    search?: string,
    page?: string,
    limit?: string,
  ): Promise<PaginatedResult<CategoryDocument>> {
    const { skip, limit: take } = parsePagination(page, limit);
    const filter = this.buildFilter(status, search);

    const [data, count] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(take)
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    return { data, count };
  }

  async findAllWithoutPagination(
    status?: CategoryStatus,
    search?: string,
  ): Promise<CategoryDocument[]> {
    return this.categoryModel
      .find(this.buildFilter(status, search))
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryDocument> {
    const category = await this.findOne(id);

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existing = await this.categoryModel
        .findOne({ name: updateCategoryDto.name })
        .exec();

      if (existing) {
        throw new ConflictException('Category already exists');
      }
    }

    Object.assign(category, definedEntries(updateCategoryDto));
    return category.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Category #${id} not found`);
    }
  }
}
