import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class UserResponseDto {

    @ApiProperty({
        type: String,
      })
      @Exclude()
      id: string;
    
      @ApiProperty({
        type: String,
      })
      uuid: string;
    
      @ApiProperty({
        type: String,
        example: 'test@example.com',
      })
      @Expose({ groups: ['me', 'admin'] })
      @ApiProperty()
      email: string;
    
      @ApiProperty()
      emailVerified?: Date;
    
      @ApiProperty()
      @Exclude({ toPlainOnly: true })
      password: string;
    
      @ApiProperty({
        type: String,
        example: 'John',
      })
      @ApiProperty()
      name?: string | null;
    
      @ApiProperty({
        type: String,
        example: 'Pozo',
      })
      @ApiProperty()
      lastName?: string | null;
    
      @ApiProperty({
        type: String,
        example: 'Esta es mi biografía',
      })
      @ApiProperty()
      bio?: string;
    
      @ApiProperty({ nullable: true })
      image: string | null;
    
      @ApiProperty()
      createdAt: Date;
    
      @ApiProperty()
      @Exclude()
      updatedAt: Date;
    
      @Exclude()
      delete_at?: Date;
}