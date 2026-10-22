import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AssetActivityType } from '../../../common/enums/asset-activity-type.enum';
import { parsePagination } from '../../../common/utils/pagination.util';
import { PaginatedResult } from '../../../common/interfaces/api-response.interface';
import { Asset, AssetDocument } from '../schemas/asset.schema';
import { AssetIssue, AssetIssueDocument } from '../schemas/asset-issue.schema';
import { HistoryService } from '../../history/history.service';
import { UsersService } from '../../../users/users.service';
import { ReportIssueDto } from '../dto/report-issue.dto';
import { ResolveIssueDto } from '../dto/resolve-issue.dto';

const ISSUE_POPULATE = [
  { path: 'asset', select: 'asset_name serial_no status' },
  { path: 'reported_by', select: 'first_name last_name email department' },
  { path: 'resolved_by', select: 'first_name last_name email' },
];

@Injectable()
export class AssetIssueService {
  constructor(
    @InjectModel(AssetIssue.name)
    private readonly issueModel: Model<AssetIssueDocument>,
    @InjectModel(Asset.name)
    private readonly assetModel: Model<AssetDocument>,
    private readonly historyService: HistoryService,
    private readonly usersService: UsersService,
  ) {}

  async createIssue(
    assetId: string,
    employeeId: string,
    dto: ReportIssueDto,
  ): Promise<AssetIssueDocument> {
    const asset = await this.assetModel.findById(assetId).exec();

    if (!asset) {
      throw new NotFoundException(`Asset #${assetId} not found`);
    }

    if (!asset.assignedTo?.employee || asset.assignedTo.employee.toString() !== employeeId) {
      throw new BadRequestException('You can only report issues for assets assigned to you');
    }

    if (asset.has_issue) {
      throw new BadRequestException('This asset already has a reported issue');
    }

    const issue = await this.issueModel.create({
      issue_type: dto.issue_type,
      description: dto.description,
      image: dto.image,
      asset: new Types.ObjectId(assetId),
      reported_by: new Types.ObjectId(employeeId),
    });

    asset.has_issue = true;
    asset.current_issue = issue._id;
    await asset.save();

    await this.historyService.record({
      asset: assetId,
      event_type: AssetActivityType.ISSUE_REPORTED,
      quantity: 1,
      performed_by: employeeId,
    });

    const admin = await this.usersService.findFirstAdmin();
    if (admin) {
      await this.sendIssueReportedEmail(admin, asset, dto);
    }

    return issue.populate(ISSUE_POPULATE);
  }

  async resolveAllIssuesForAsset(
    assetId: string,
    adminId: string,
    dto: ResolveIssueDto,
  ): Promise<AssetIssueDocument[]> {
    const asset = await this.assetModel.findById(assetId).exec();

    if (!asset) {
      throw new NotFoundException(`Asset #${assetId} not found`);
    }

    const openIssues = await this.issueModel
      .find({ asset: assetId, is_resolved: false })
      .exec();

    if (openIssues.length === 0) {
      throw new BadRequestException('This asset has no open issues to resolve');
    }

    const resolvedIssues = await Promise.all(
      openIssues.map(async (issue) => {
        issue.is_resolved = true;
        issue.resolution_note = dto.resolution_note;
        issue.resolved_by = new Types.ObjectId(adminId);
        issue.resolved_at = new Date();
        return issue.save();
      }),
    );

    asset.has_issue = false;
    asset.current_issue = undefined;
    await asset.save();

    await this.historyService.record({
      asset: assetId,
      event_type: AssetActivityType.REPAIRED,
      quantity: 1,
      performed_by: adminId,
    });

    if (asset.assignedTo?.employee) {
      const employee = await this.usersService.findById(asset.assignedTo.employee.toString());
      await this.sendRepairedEmail(employee, asset, dto.resolution_note);
    }

    return this.issueModel
      .find({ asset: assetId, is_resolved: true })
      .populate(ISSUE_POPULATE)
      .exec();
  }

  async findById(id: string): Promise<AssetIssueDocument> {
    const issue = await this.issueModel
      .findById(id)
      .populate(ISSUE_POPULATE)
      .exec();

    if (!issue) {
      throw new NotFoundException(`Issue #${id} not found`);
    }

    return issue;
  }

  async findAll(
    filters: {
      asset?: string;
      is_resolved?: boolean;
      issue_type?: string;
      start_date?: string;
      end_date?: string;
    },
    page?: string,
    limit?: string,
  ): Promise<PaginatedResult<AssetIssueDocument>> {
    const { skip, limit: take } = parsePagination(page, limit);
    const filter = this.buildFilter(filters);

    const [data, count] = await Promise.all([
      this.issueModel
        .find(filter)
        .populate(ISSUE_POPULATE)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .exec(),
      this.issueModel.countDocuments(filter).exec(),
    ]);

    return { data, count };
  }

  async findAllWithoutPagination(
    filters: {
      asset?: string;
      is_resolved?: boolean;
      issue_type?: string;
      start_date?: string;
      end_date?: string;
    },
  ): Promise<AssetIssueDocument[]> {
    return this.issueModel
      .find(this.buildFilter(filters))
      .populate(ISSUE_POPULATE)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByAsset(assetId: string): Promise<AssetIssueDocument[]> {
    return this.issueModel
      .find({ asset: assetId })
      .populate(ISSUE_POPULATE)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOpenIssues(): Promise<AssetIssueDocument[]> {
    return this.issueModel
      .find({ is_resolved: false })
      .populate(ISSUE_POPULATE)
      .sort({ createdAt: -1 })
      .exec();
  }

  private buildFilter(filters: {
    asset?: string;
    is_resolved?: boolean;
    issue_type?: string;
    start_date?: string;
    end_date?: string;
  }): QueryFilter<AssetIssueDocument> {
    const filter: QueryFilter<AssetIssueDocument> = {};

    if (filters.asset) {
      filter.asset = filters.asset;
    }

    if (filters.is_resolved !== undefined) {
      filter.is_resolved = filters.is_resolved;
    }

    if (filters.issue_type?.trim()) {
      filter.issue_type = { $regex: filters.issue_type.trim(), $options: 'i' };
    }

    if (filters.start_date || filters.end_date) {
      filter.reported_date = {};
      if (filters.start_date) {
        filter.reported_date.$gte = new Date(filters.start_date);
      }
      if (filters.end_date) {
        filter.reported_date.$lte = new Date(filters.end_date);
      }
    }

    return filter;
  }

  private async sendIssueReportedEmail(
    admin: { first_name: string; last_name: string; email: string },
    asset: AssetDocument,
    dto: ReportIssueDto,
  ): Promise<void> {
    const subject = `Issue Reported: ${asset.asset_name} (${asset.serial_no})`;
    const text = `
Dear ${admin.first_name} ${admin.last_name},

An issue has been reported for the following asset:

Asset Name: ${asset.asset_name}
Serial Number: ${asset.serial_no}
Issue Type: ${dto.issue_type}
Description: ${dto.description}
${dto.image ? `Image: ${dto.image}` : ''}
Reported At: ${new Date().toLocaleString()}

Please review and take appropriate action.

Best regards,
HR Mgt System
    `.trim();
    const html = `
<p>Dear ${admin.first_name} ${admin.last_name},</p>
<p>An issue has been reported for the following asset:</p>
<ul>
  <li><strong>Asset Name:</strong> ${asset.asset_name}</li>
  <li><strong>Serial Number:</strong> ${asset.serial_no}</li>
  <li><strong>Issue Type:</strong> ${dto.issue_type}</li>
  <li><strong>Description:</strong> ${dto.description}</li>
  ${dto.image ? `<li><strong>Image:</strong> <a href="${dto.image}">${dto.image}</a></li>` : ''}
  <li><strong>Reported At:</strong> ${new Date().toLocaleString()}</li>
</ul>
<p>Please review and take appropriate action.</p>
<p>Best regards,<br>HR Mgt System</p>
    `.trim();

    await this.usersService['mailService'].send({
      to: admin.email,
      toName: `${admin.first_name} ${admin.last_name}`,
      subject,
      text,
      html,
    });
  }

  private async sendRepairedEmail(
    employee: { first_name: string; last_name: string; email: string },
    asset: AssetDocument,
    resolutionNote?: string,
  ): Promise<void> {
    const subject = `Asset Repaired: ${asset.asset_name} (${asset.serial_no})`;
    const text = `
Dear ${employee.first_name} ${employee.last_name},

The following asset has been repaired and is now ready for use:

Asset Name: ${asset.asset_name}
Serial Number: ${asset.serial_no}
${resolutionNote ? `Resolution Note: ${resolutionNote}` : ''}
Repaired At: ${new Date().toLocaleString()}

You may continue using the asset as normal.

Best regards,
HR Mgt System
    `.trim();
    const html = `
<p>Dear ${employee.first_name} ${employee.last_name},</p>
<p>The following asset has been repaired and is now ready for use:</p>
<ul>
  <li><strong>Asset Name:</strong> ${asset.asset_name}</li>
  <li><strong>Serial Number:</strong> ${asset.serial_no}</li>
  ${resolutionNote ? `<li><strong>Resolution Note:</strong> ${resolutionNote}</li>` : ''}
  <li><strong>Repaired At:</strong> ${new Date().toLocaleString()}</li>
</ul>
<p>You may continue using the asset as normal.</p>
<p>Best regards,<br>HR Mgt System</p>
    `.trim();

    await this.usersService['mailService'].send({
      to: employee.email,
      toName: `${employee.first_name} ${employee.last_name}`,
      subject,
      text,
      html,
    });
  }
}