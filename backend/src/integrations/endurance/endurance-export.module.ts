import { Module, forwardRef } from '@nestjs/common';
import { EnduranceExportService } from './endurance-export.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { DeviceOAuthModule } from '../../auth/devices/device-oauth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DeviceOAuthModule)],
  providers: [EnduranceExportService],
  exports: [EnduranceExportService],
})
export class EnduranceExportModule {}

