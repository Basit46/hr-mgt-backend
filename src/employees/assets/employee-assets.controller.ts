import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserType } from '../../common/enums/user-type.enum';
import { PaginatedResult } from '../../common/interfaces/api-response.interface';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AssetDocument } from '../../admin/assets/schemas/asset.schema';
import { EmployeeAssetsService } from './employee-assets.service';
import { ReportIssueDto } from '../../admin/assets/dto/report-issue.dto';

@Controller('employees/assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.EMPLOYEE)
export class EmployeeAssetsController {
  constructor(private readonly employeeAssetsService: EmployeeAssetsService) {}

  @Get()
  @ResponseMessage('Assigned assets retrieved successfully')
  findAllForEmployee(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('batch') batch?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedResult<AssetDocument>> {
    return this.employeeAssetsService.findAllForEmployee(
      currentUser.userId,
      page ?? batch,
      limit,
    );
  }

  @Get('all')
  @ResponseMessage('Assigned assets retrieved successfully')
  findAllForEmployeeWithoutPagination(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AssetDocument[]> {
    return this.employeeAssetsService.findAllForEmployeeWithoutPagination(
      currentUser.userId,
    );
  }

  @Post(':id/report-issue')
  @ResponseMessage('Issue reported successfully')
  async reportIssue(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() reportIssueDto: ReportIssueDto,
  ): Promise<AssetDocument> {
    return this.employeeAssetsService.reportIssue(id, currentUser.userId, reportIssueDto);
  }
}
