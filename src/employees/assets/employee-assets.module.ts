import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asset, AssetSchema } from '../../admin/assets/schemas/asset.schema';
import { AssetsModule } from '../../admin/assets/assets.module';
import { EmployeeAssetsService } from './employee-assets.service';
import { EmployeeAssetsController } from './employee-assets.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }]),
    AssetsModule,
  ],
  controllers: [EmployeeAssetsController],
  providers: [EmployeeAssetsService],
})
export class EmployeeAssetsModule {}
