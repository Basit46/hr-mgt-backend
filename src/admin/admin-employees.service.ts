import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { UserType } from '../common/enums/user-type.enum';
import { PaginatedResult } from '../common/interfaces/api-response.interface';
import { parsePagination } from '../common/utils/pagination.util';
import { buildSearchRegex, escapeRegex } from '../common/utils/search.util';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Asset, AssetDocument } from './assets/schemas/asset.schema';

export interface EmployeeSummary {
  _id: Types.ObjectId;
  first_name: string;
  last_name: string;
  email: string;
  user_type: UserType;
  department: string;
  role: string;
  avatar?: string;
  avatar_url: string;
  is_active: boolean;
  is_email_verified: boolean;
  asset_count: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AdminEmployeesService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
  ) {}

  async findAllEmployees(
    search?: string,
    department?: string,
    isActive?: boolean,
    page?: string,
    limit?: string,
  ): Promise<PaginatedResult<EmployeeSummary>> {
    const { skip, limit: take } = parsePagination(page, limit);
    const filter = this.buildFilter(search, department, isActive);

    const [employees, count] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return { data: await this.withAssetCounts(employees), count };
  }

  async findAllEmployeesNoPagination(
    search?: string,
    department?: string,
    isActive?: boolean,
  ): Promise<EmployeeSummary[]> {
    const filter = this.buildFilter(search, department, isActive);

    const employees = await this.userModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    return this.withAssetCounts(employees);
  }

  private buildFilter(
    search?: string,
    department?: string,
    isActive?: boolean,
  ): QueryFilter<UserDocument> {
    const filter: QueryFilter<UserDocument> = { user_type: UserType.EMPLOYEE };

    if (department?.trim()) {
      filter.department = {
        $regex: `^${escapeRegex(department.trim())}$`,
        $options: 'i',
      };
    }

    if (isActive !== undefined) {
      filter.is_active = isActive;
    }

    if (search?.trim()) {
      const regex = buildSearchRegex(search);
      filter.$or = [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { department: regex },
        { role: regex },
      ];
    }

    return filter;
  }

  private async withAssetCounts(
    employees: UserDocument[],
  ): Promise<EmployeeSummary[]> {
    const rows = await this.assetModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            'assignedTo.employee': { $in: employees.map((e) => e._id) },
          },
        },
        { $group: { _id: '$assignedTo.employee', count: { $sum: 1 } } },
      ])
      .exec();

    const byEmployee = new Map(rows.map((row) => [String(row._id), row.count]));

    return employees.map((employee) => ({
      _id: employee._id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      user_type: employee.user_type,
      department: employee.department,
      role: employee.role,
      avatar: employee.avatar,
      avatar_url: employee.avatar_url,
      is_active: employee.is_active,
      is_email_verified: employee.is_email_verified,
      asset_count: byEmployee.get(String(employee._id)) ?? 0,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    }));
  }
}
