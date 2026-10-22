import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { parsePagination } from '../../common/utils/pagination.util';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { Asset, AssetDocument } from '../../admin/assets/schemas/asset.schema';
import { AssetHistoryDocument } from '../../admin/history/schemas/asset-history.schema';
import { HistoryService } from '../../admin/history/history.service';
import { AssetIssueService } from '../../admin/assets/services/asset-issue.service';
import { ReportIssueDto } from '../../admin/assets/dto/report-issue.dto';

const EMPLOYEE_ASSET_POPULATE = [
  { path: 'store', select: 'name location state status' },
  { path: 'category', select: 'name status' },
];

const EMPLOYEE_RELEVANT_EVENT_TYPES = [
  'assigned',
  'returned',
  'repaired',
  'issue_reported',
  'others',
];

@Injectable()
export class EmployeeAssetsService {
  constructor(
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
    private readonly assetIssueService: AssetIssueService,
    private readonly historyService: HistoryService,
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

  async getDetails(
    assetId: string,
    employeeId: string,
  ): Promise<{ asset: AssetDocument; history: AssetHistoryDocument[] }> {
    const asset = await this.assetModel
      .findById(assetId)
      .populate(EMPLOYEE_ASSET_POPULATE)
      .exec();

    if (!asset) {
      throw new NotFoundException(`Asset #${assetId} not found`);
    }

    if (!asset.assignedTo?.employee || asset.assignedTo.employee.toString() !== employeeId) {
      throw new NotFoundException(`Asset #${assetId} not found`);
    }

    const history = await this.historyService.findAllWithoutPagination({
      asset: assetId,
    });

    const filteredHistory = history.filter((entry) =>
      EMPLOYEE_RELEVANT_EVENT_TYPES.includes(entry.event_type),
    );

    return { asset, history: filteredHistory };
  }

  async reportIssue(
    assetId: string,
    employeeId: string,
    reportIssueDto: ReportIssueDto,
  ): Promise<AssetDocument> {
    await this.assetIssueService.createIssue(assetId, employeeId, reportIssueDto);
    const asset = await this.assetModel
      .findById(assetId)
      .populate(EMPLOYEE_ASSET_POPULATE)
      .exec();
    if (!asset) {
      throw new Error('Asset not found after issue creation');
    }
    return asset;
  }
}
