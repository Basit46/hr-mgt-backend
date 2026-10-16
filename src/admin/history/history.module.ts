import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { Asset, AssetSchema } from '../assets/schemas/asset.schema';
import {
  AssetHistory,
  AssetHistorySchema,
} from './schemas/asset-history.schema';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AssetHistory.name, schema: AssetHistorySchema },
      { name: Asset.name, schema: AssetSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
