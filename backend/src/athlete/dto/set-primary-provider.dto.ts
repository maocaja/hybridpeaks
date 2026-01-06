import { IsEnum, IsNotEmpty } from 'class-validator';

export enum DeviceProvider {
  GARMIN = 'GARMIN',
  WAHOO = 'WAHOO',
}

export class SetPrimaryProviderDto {
  @IsEnum(DeviceProvider)
  @IsNotEmpty()
  provider!: DeviceProvider;
}


