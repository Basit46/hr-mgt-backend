import { Controller, Get, UseGuards } from '@nestjs/common';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DashboardMetrics, DashboardService } from './dashboard.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ResponseMessage('Dashboard metrics retrieved successfully')
  getMetrics(): Promise<DashboardMetrics> {
    return this.dashboardService.getMetrics();
  }
}
