import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteAthleteDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
