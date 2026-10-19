import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { StoreStatus } from '../../common/enums/store-status.enum';
import { buildSearchRegex } from '../../common/utils/search.util';
import { parsePagination } from '../../common/utils/pagination.util';
import { definedEntries } from '../../common/utils/assign.util';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { Store, StoreDocument } from './schemas/store.schema';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,
  ) {}

  async create(createStoreDto: CreateStoreDto): Promise<StoreDocument> {
    const existing = await this.storeModel
      .findOne({ name: createStoreDto.name })
      .exec();

    if (existing) {
      throw new ConflictException('Store already exists');
    }

    return this.storeModel.create(createStoreDto);
  }

  private buildFilter(status?: StoreStatus, search?: string) {
    const filter: QueryFilter<StoreDocument> = {};

    if (status) {
      filter.status = status;
    }

    if (search?.trim()) {
      const regex = buildSearchRegex(search);
      filter.$or = [
        { name: regex },
        { location: regex },
        { state: regex },
        { manager_name: regex },
      ];
    }

    return filter;
  }

  async findAll(
    status?: StoreStatus,
    search?: string,
    page?: string,
    limit?: string,
  ): Promise<PaginatedResult<StoreDocument>> {
    const { skip, limit: take } = parsePagination(page, limit);
    const filter = this.buildFilter(status, search);

    const [data, count] = await Promise.all([
      this.storeModel
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(take)
        .exec(),
      this.storeModel.countDocuments(filter).exec(),
    ]);

    return { data, count };
  }

  async findAllWithoutPagination(
    status?: StoreStatus,
    search?: string,
  ): Promise<StoreDocument[]> {
    return this.storeModel
      .find(this.buildFilter(status, search))
      .sort({ name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<StoreDocument> {
    const store = await this.storeModel.findById(id).exec();
    if (!store) {
      throw new NotFoundException(`Store #${id} not found`);
    }
    return store;
  }

  async update(
    id: string,
    updateStoreDto: UpdateStoreDto,
  ): Promise<StoreDocument> {
    const store = await this.findOne(id);

    if (updateStoreDto.name && updateStoreDto.name !== store.name) {
      const existing = await this.storeModel
        .findOne({ name: updateStoreDto.name })
        .exec();

      if (existing) {
        throw new ConflictException('Store already exists');
      }
    }

    Object.assign(store, definedEntries(updateStoreDto));
    return store.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.storeModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Store #${id} not found`);
    }
  }
}
