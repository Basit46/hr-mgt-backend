import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { CategoriesModule } from './categories/categories.module';
import { StoresModule } from './stores/stores.module';
import { AssetsModule } from './assets/assets.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HistoryModule } from './history/history.module';

@Module({
  imports: [
    UsersModule,
    DepartmentsModule,
    CategoriesModule,
    StoresModule,
    AssetsModule,
    DashboardModule,
    HistoryModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
