import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asset, AssetSchema } from '../../admin/assets/schemas/asset.schema';
import { EmployeeAssetsService } from './employee-assets.service';
import { EmployeeAssetsController } from './employee-assets.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }]),
  ],
  controllers: [EmployeeAssetsController],
  providers: [EmployeeAssetsService],
})
export class EmployeeAssetsModule {}
