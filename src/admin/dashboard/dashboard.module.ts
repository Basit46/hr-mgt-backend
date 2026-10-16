import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { CategoriesModule } from '../categories/categories.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [AssetsModule, CategoriesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
