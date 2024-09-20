import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from 'src/core/users/entities/user.entity';


export class LoginResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty()
  expires_in: number;

  @ApiProperty({
    type: () => UserEntity,
  })
  user: Pick<UserEntity, 'lastName' | 'name' | 'email' | 'image'>;

}