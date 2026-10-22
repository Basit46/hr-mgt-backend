import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../../users/users.module';
import { StoresModule } from '../stores/stores.module';
import { CategoriesModule } from '../categories/categories.module';
import { HistoryModule } from '../history/history.module';
import { Asset, AssetSchema } from './schemas/asset.schema';
import { AssetIssue, AssetIssueSchema } from './schemas/asset-issue.schema';
import { AssetsService } from './assets.service';
import { AssetIssueService } from './services/asset-issue.service';
import { AssetsController } from './assets.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: AssetIssue.name, schema: AssetIssueSchema },
    ]),
    UsersModule,
    StoresModule,
    CategoriesModule,
    HistoryModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService, AssetIssueService],
  exports: [MongooseModule, AssetIssueService],
})
export class AssetsModule {}
