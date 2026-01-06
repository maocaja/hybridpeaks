import { IsString, IsNotEmpty } from 'class-validator';

export class DeviceCallbackDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;
}

