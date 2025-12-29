import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  @Length(32, 128)
  token!: string;
}
