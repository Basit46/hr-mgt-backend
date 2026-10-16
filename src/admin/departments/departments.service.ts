import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { parsePagination } from '../../common/utils/pagination.util';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
  ) {}

  async create(
    createDepartmentDto: CreateDepartmentDto,
  ): Promise<DepartmentDocument> {
    const existing = await this.departmentModel
      .findOne({ name: createDepartmentDto.name })
      .exec();

    if (existing) {
      throw new ConflictException('Department already exists');
    }

    return this.departmentModel.create(createDepartmentDto);
  }

  async findAll(
    page?: string,
    limit?: string,
  ): Promise<PaginatedResult<DepartmentDocument>> {
    const { skip, limit: take } = parsePagination(page, limit);

    const [data, count] = await Promise.all([
      this.departmentModel
        .find()
        .sort({ name: 1 })
        .skip(skip)
        .limit(take)
        .exec(),
      this.departmentModel.countDocuments().exec(),
    ]);

    return { data, count };
  }

  async findAllWithoutPagination(): Promise<DepartmentDocument[]> {
    return this.departmentModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<DepartmentDocument> {
    const department = await this.departmentModel.findById(id).exec();
    if (!department) {
      throw new NotFoundException(`Department #${id} not found`);
    }
    return department;
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<DepartmentDocument> {
    const department = await this.findOne(id);
    Object.assign(department, updateDepartmentDto);
    return department.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.departmentModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Department #${id} not found`);
    }
  }
}
