import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserType } from '../../common/enums/user-type.enum';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DepartmentsService } from './departments.service';
import { DepartmentDocument } from './schemas/department.schema';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('admin/departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Department created successfully')
  create(
    @Body() createDepartmentDto: CreateDepartmentDto,
  ): Promise<DepartmentDocument> {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @ResponseMessage('Departments retrieved successfully')
  findAll(
    @Query('page') page?: string,
    @Query('batch') batch?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<DepartmentDocument>> {
    return this.departmentsService.findAll(page ?? batch, limit);
  }

  @Get('all')
  @ResponseMessage('Departments retrieved successfully')
  findAllWithoutPagination(): Promise<DepartmentDocument[]> {
    return this.departmentsService.findAllWithoutPagination();
  }

  @Get(':id')
  @ResponseMessage('Department retrieved successfully')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<DepartmentDocument> {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Department updated successfully')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<DepartmentDocument> {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ResponseMessage('Department deleted successfully')
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.departmentsService.remove(id);
  }
}
