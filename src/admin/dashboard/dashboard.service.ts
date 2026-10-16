import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryStatus } from '../../common/enums/category-status.enum';
import { Asset, AssetDocument } from '../assets/schemas/asset.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';

export interface DashboardMetrics {
  total_assets: number;
  total_assigned_items: number;
  total_unassigned_items: number;
  total_low_stock_categories: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async getMetrics(): Promise<DashboardMetrics> {
    const [
      totalAssets,
      totalAssignedItems,
      totalUnassignedItems,
      totalLowStockCategories,
    ] = await Promise.all([
      this.assetModel.countDocuments().exec(),
      this.assetModel
        .countDocuments({ 'assignedTo.employee': { $exists: true } })
        .exec(),
      this.assetModel
        .countDocuments({
          $or: [
            { assignedTo: { $exists: false } },
            { 'assignedTo.employee': { $exists: false } },
          ],
        })
        .exec(),
      this.categoryModel
        .countDocuments({ status: CategoryStatus.LOW_STOCK })
        .exec(),
    ]);

    return {
      total_assets: totalAssets,
      total_assigned_items: totalAssignedItems,
      total_unassigned_items: totalUnassignedItems,
      total_low_stock_categories: totalLowStockCategories,
    };
  }
}
