import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { parsePagination } from '../../common/utils/pagination.util';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { Asset, AssetDocument } from '../../admin/assets/schemas/asset.schema';

const EMPLOYEE_ASSET_POPULATE = [
  { path: 'store', select: 'name location state status' },
  { path: 'category', select: 'name status' },
];

@Injectable()
export class EmployeeAssetsService {
  constructor(
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
  ) {}

  private buildFilter(employeeId: string): QueryFilter<AssetDocument> {
    return { 'assignedTo.employee': employeeId };
  }

  async findAllForEmployee(
    employeeId: string,
    page?: string,
    limit?: string,
  ): Promise<PaginatedResult<AssetDocument>> {
    const { skip, limit: take } = parsePagination(page, limit);
    const filter = this.buildFilter(employeeId);

    const [data, count] = await Promise.all([
      this.assetModel
        .find(filter)
        .populate(EMPLOYEE_ASSET_POPULATE)
        .sort({ 'assignedTo.assignedAt': -1 })
        .skip(skip)
        .limit(take)
        .exec(),
      this.assetModel.countDocuments(filter).exec(),
    ]);

    return { data, count };
  }

  async findAllForEmployeeWithoutPagination(
    employeeId: string,
  ): Promise<AssetDocument[]> {
    return this.assetModel
      .find(this.buildFilter(employeeId))
      .populate(EMPLOYEE_ASSET_POPULATE)
      .sort({ 'assignedTo.assignedAt': -1 })
      .exec();
  }
}
