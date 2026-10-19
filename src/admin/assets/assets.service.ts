import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AssetStatus } from '../../common/enums/asset-status.enum';
import { AssetActivityType } from '../../common/enums/asset-activity-type.enum';
import { buildSearchRegex } from '../../common/utils/search.util';
import { parsePagination } from '../../common/utils/pagination.util';
import { definedEntries } from '../../common/utils/assign.util';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { UsersService } from '../../users/users.service';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { Store, StoreDocument } from '../stores/schemas/store.schema';
import { HistoryService } from '../history/history.service';
import { Asset, AssetDocument } from './schemas/asset.schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';

const ASSET_POPULATE = [
  { path: 'store', select: 'name location state status' },
  { path: 'category', select: 'name status' },
  {
    path: 'assignedTo.employee',
    select: 'first_name last_name email user_type',
  },
];

const ASSET_DETAILS_POPULATE = [
  { path: 'store' },
  { path: 'category' },
  { path: 'assignedTo.employee' },
];

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly usersService: UsersService,
    private readonly historyService: HistoryService,
  ) {}

  async create(
    createAssetDto: CreateAssetDto,
    performedBy: string,
  ): Promise<AssetDocument> {
    const existing = await this.assetModel
      .findOne({ serial_no: createAssetDto.serial_no })
      .exec();

    if (existing) {
      throw new ConflictException(
        'Asset with this serial number already exists',
      );
    }

    await this.assertReferences(createAssetDto.store, createAssetDto.category);

    const asset = await this.assetModel.create(createAssetDto);

    await this.historyService.record({
      asset: asset._id.toString(),
      event_type: AssetActivityType.ADDED,
      quantity: 1,
      performed_by: performedBy,
    });

    return asset.populate(ASSET_POPULATE);
  }

  private buildFilter(
    status?: AssetStatus,
    search?: string,
    category?: string,
  ) {
    const filter: QueryFilter<AssetDocument> = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (search?.trim()) {
      const regex = buildSearchRegex(search);
      filter.$or = [
        { asset_name: regex },
        { serial_no: regex },
        { description: regex },
      ];
    }

    return filter;
  }

  async findAll(
    status?: AssetStatus,
    search?: string,
    category?: string,
    page?: string,
    limit?: string,
  ): Promise<PaginatedResult<AssetDocument>> {
    const { skip, limit: take } = parsePagination(page, limit);
    const filter = this.buildFilter(status, search, category);

    const [data, count] = await Promise.all([
      this.assetModel
        .find(filter)
        .populate(ASSET_POPULATE)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .exec(),
      this.assetModel.countDocuments(filter).exec(),
    ]);

    return { data, count };
  }

  async findAllWithoutPagination(
    status?: AssetStatus,
    search?: string,
    category?: string,
  ): Promise<AssetDocument[]> {
    return this.assetModel
      .find(this.buildFilter(status, search, category))
      .populate(ASSET_POPULATE)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<AssetDocument> {
    const asset = await this.assetModel
      .findById(id)
      .populate(ASSET_POPULATE)
      .exec();

    if (!asset) {
      throw new NotFoundException(`Asset #${id} not found`);
    }

    return asset;
  }

  async getDetails(id: string): Promise<Record<string, unknown>> {
    const asset = await this.assetModel
      .findById(id)
      .populate(ASSET_DETAILS_POPULATE)
      .exec();

    if (!asset) {
      throw new NotFoundException(`Asset #${id} not found`);
    }

    const history = await this.historyService.findAllWithoutPagination({
      asset: id,
    });

    return { ...asset.toJSON(), history };
  }

  async update(
    id: string,
    updateAssetDto: UpdateAssetDto,
  ): Promise<AssetDocument> {
    const asset = await this.assetModel.findById(id).exec();

    if (!asset) {
      throw new NotFoundException(`Asset #${id} not found`);
    }

    if (
      updateAssetDto.serial_no &&
      updateAssetDto.serial_no !== asset.serial_no
    ) {
      const existing = await this.assetModel
        .findOne({ serial_no: updateAssetDto.serial_no })
        .exec();

      if (existing) {
        throw new ConflictException(
          'Asset with this serial number already exists',
        );
      }
    }

    if (updateAssetDto.store || updateAssetDto.category) {
      await this.assertReferences(
        updateAssetDto.store ?? asset.store.toString(),
        updateAssetDto.category ?? asset.category.toString(),
      );
    }

    Object.assign(asset, definedEntries(updateAssetDto));
    await asset.save();
    return asset.populate(ASSET_POPULATE);
  }

  async assign(
    assignAssetDto: AssignAssetDto,
    performedBy: string,
  ): Promise<AssetDocument> {
    const asset = await this.findOne(assignAssetDto.asset_id);

    if (asset.assignedTo?.employee) {
      throw new ConflictException('Asset is already assigned');
    }

    await this.usersService.findById(assignAssetDto.employee_id);

    asset.assignedTo = {
      employee: new Types.ObjectId(assignAssetDto.employee_id),
      assignedAt: new Date(),
      assign_note: assignAssetDto.assign_note,
    };

    await asset.save();

    await this.historyService.record({
      asset: assignAssetDto.asset_id,
      event_type: AssetActivityType.ASSIGNED,
      quantity: 1,
      performed_by: performedBy,
    });

    return asset.populate(ASSET_POPULATE);
  }

  async remove(id: string): Promise<void> {
    const result = await this.assetModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Asset #${id} not found`);
    }
  }

  private async assertReferences(
    storeId: string,
    categoryId: string,
  ): Promise<void> {
    const [store, category] = await Promise.all([
      this.storeModel.findById(storeId).exec(),
      this.categoryModel.findById(categoryId).exec(),
    ]);

    if (!store) {
      throw new BadRequestException(`Store #${storeId} not found`);
    }

    if (!category) {
      throw new BadRequestException(`Category #${categoryId} not found`);
    }
  }
}
