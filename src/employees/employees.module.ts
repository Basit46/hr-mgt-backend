import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeeAssetsModule } from './assets/employee-assets.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule, EmployeeAssetsModule],
  controllers: [EmployeesController],
})
export class EmployeesModule {}
