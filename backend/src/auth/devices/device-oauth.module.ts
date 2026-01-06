import { Module, forwardRef } from '@nestjs/common';
import { DeviceOAuthController } from './device-oauth.controller';
import { DeviceOAuthService } from './device-oauth.service';
import { DeviceApiService } from './device-api.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { EnduranceExportModule } from '../../integrations/endurance/endurance-export.module';

@Module({
  imports: [PrismaModule, ConfigModule, forwardRef(() => EnduranceExportModule)],
  controllers: [DeviceOAuthController],
  providers: [DeviceOAuthService, DeviceApiService],
  exports: [DeviceOAuthService, DeviceApiService],
})
export class DeviceOAuthModule {}


