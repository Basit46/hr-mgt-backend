import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AssetActivityType } from '../../common/enums/asset-activity-type.enum';
import { parsePagination } from '../../common/utils/pagination.util';
import { buildSearchRegex, escapeRegex } from '../../common/utils/search.util';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Asset, AssetDocument } from '../assets/schemas/asset.schema';
import {
  AssetHistory,
  AssetHistoryDocument,
} from './schemas/asset-history.schema';

export interface RecordAssetActivityInput {
  asset: string;
  event_type: AssetActivityType;
  quantity: number;
  performed_by: string;
}

export interface HistoryFilters {
  asset?: string;
  eventType?: AssetActivityType;
  department?: string;
  search?: string;
}

const HISTORY_POPULATE = [
  { path: 'asset', select: 'asset_name serial_no status' },
  {
    path: 'performed_by',
    select: 'first_name last_name email avatar user_type',
  },
];

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(AssetHistory.name)
    private readonly historyModel: Model<AssetHistoryDocument>,
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async record(input: RecordAssetActivityInput): Promise<AssetHistoryDocument> {
    return this.historyModel.create({
      asset: new Types.ObjectId(input.asset),
      event_type: input.event_type,
      quantity: input.quantity,
      performed_by: new Types.ObjectId(input.performed_by),
    });
  }

  private async buildFilter(
    filters: HistoryFilters,
  ): Promise<QueryFilter<AssetHistoryDocument>> {
    const clauses: QueryFilter<AssetHistoryDocument>[] = [];

    if (filters.asset) {
      clauses.push({ asset: filters.asset });
    }

    if (filters.eventType) {
      clauses.push({ event_type: filters.eventType });
    }

    if (filters.department?.trim()) {
      const department = new RegExp(
        `^${escapeRegex(filters.department.trim())}$`,
        'i',
      );
      clauses.push({
        performed_by: { $in: await this.findUserIds({ department }) },
      });
    }

    if (filters.search?.trim()) {
      const regex = buildSearchRegex(filters.search);

      const [assetIds, userIds] = await Promise.all([
        this.findAssetIds(regex),
        this.findUserIds({
          $or: [{ first_name: regex }, { last_name: regex }, { email: regex }],
        }),
      ]);

      clauses.push({
        $or: [{ asset: { $in: assetIds } }, { performed_by: { $in: userIds } }],
      });
    }

    if (clauses.length === 0) {
      return {};
    }

    return { $and: clauses };
  }

  private async findAssetIds(
    filter: QueryFilter<AssetDocument>,
  ): Promise<Types.ObjectId[]> {
    const assets = await this.assetModel
      .find(filter)
      .select('_id')
      .lean()
      .exec();

    return assets.map((asset) => asset._id);
  }

  private async findUserIds(
    filter: QueryFilter<UserDocument>,
  ): Promise<Types.ObjectId[]> {
    const users = await this.userModel.find(filter).select('_id').lean().exec();

    return users.map((user) => user._id);
  }

  async findAll(
    filters: HistoryFilters,
    page?: string,
    limit?: string,
  ): Promise<PaginatedResult<AssetHistoryDocument>> {
    const { skip, limit: take } = parsePagination(page, limit);
    const filter = await this.buildFilter(filters);

    const [data, count] = await Promise.all([
      this.historyModel
        .find(filter)
        .populate(HISTORY_POPULATE)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .exec(),
      this.historyModel.countDocuments(filter).exec(),
    ]);

    return { data, count };
  }

  async findAllWithoutPagination(
    filters: HistoryFilters,
  ): Promise<AssetHistoryDocument[]> {
    return this.historyModel
      .find(await this.buildFilter(filters))
      .populate(HISTORY_POPULATE)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<AssetHistoryDocument> {
    const history = await this.historyModel
      .findById(id)
      .populate(HISTORY_POPULATE)
      .exec();

    if (!history) {
      throw new NotFoundException(`History #${id} not found`);
    }

    return history;
  }
}
