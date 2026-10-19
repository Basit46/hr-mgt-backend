import {
  BadRequestException,
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
import { USER_TYPES, UserType } from '../common/enums/user-type.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RegisterDto } from '../users/dto/register.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { PaginatedResult } from '../common/interfaces/api-response.interface';
import {
  AdminEmployeesService,
  EmployeeSummary,
} from './admin-employees.service';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminEmployeesService: AdminEmployeesService,
  ) {}

  @Get('stats')
  @ResponseMessage('Statistics retrieved successfully')
  getStats(): Promise<{ admins: number; employees: number; total: number }> {
    return this.usersService.getStats();
  }

  @Get('users')
  @ResponseMessage('Users retrieved successfully')
  async findAll(
    @Query('user_type') userType?: string,
  ): Promise<UserDocument[]> {
    if (userType && !USER_TYPES.includes(userType as UserType)) {
      throw new BadRequestException(
        `user_type must be one of: ${USER_TYPES.join(', ')}`,
      );
    }
    return this.usersService.findAll(userType as UserType | undefined);
  }

  @Get('employees')
  @ResponseMessage('Employees retrieved successfully')
  findAllEmployees(
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('is_active') isActive?: string,
    @Query('page') page?: string,
    @Query('batch') batch?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<EmployeeSummary>> {
    return this.adminEmployeesService.findAllEmployees(
      search,
      department,
      this.parseIsActive(isActive),
      page ?? batch,
      limit,
    );
  }

  private parseIsActive(value?: string): boolean | undefined {
    if (value === undefined || value === '') return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException('is_active must be either true or false');
  }

  @Get('users/:id')
  @ResponseMessage('User retrieved successfully')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<UserDocument> {
    return this.usersService.findById(id);
  }

  @Post('users')
  @ResponseMessage('User created successfully')
  async create(@Body() registerDto: RegisterDto): Promise<UserDocument> {
    const user = await this.usersService.create(registerDto);
    const code = await this.usersService.issueVerificationCode(user);
    await this.usersService.sendVerificationEmail(user, code);
    return user;
  }

  @Patch('users/:id')
  @ResponseMessage('User updated successfully')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('users/:id')
  @ResponseMessage('User deleted successfully')
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
