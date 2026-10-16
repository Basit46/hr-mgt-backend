import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserType } from '../common/enums/user-type.enum';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.EMPLOYEE)
export class EmployeesController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ResponseMessage('Profile retrieved successfully')
  getMe(@CurrentUser() currentUser: AuthenticatedUser): Promise<UserDocument> {
    return this.usersService.findById(currentUser.userId);
  }

  @Patch('me')
  @ResponseMessage('Profile updated successfully')
  updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    return this.usersService.update(currentUser.userId, updateUserDto);
  }

  @Get('directory')
  @ResponseMessage('Directory retrieved successfully')
  getDirectory(): Promise<unknown[]> {
    return this.usersService.findDirectory();
  }

  @Get(':id')
  @ResponseMessage('Employee retrieved successfully')
  getColleague(@Param('id', ParseObjectIdPipe) id: string): Promise<unknown> {
    return this.usersService.findPublicProfileById(id);
  }
}
