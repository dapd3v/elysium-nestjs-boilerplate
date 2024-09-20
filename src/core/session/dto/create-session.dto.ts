import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDate,  } from 'class-validator';

export class CreateSessionDto {

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  sessionToken: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  userId: string;

  @IsDate()
  @ApiProperty()
  @IsNotEmpty()
  expires: Date;

}
