import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsEmail, IsOptional, IsNotEmpty, IsUrl, MinLength } from 'class-validator';
import { lowerCaseTransformer } from 'src/core/utils/transformers/lower-case.transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @Transform(lowerCaseTransformer)
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'John', type: String })
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Pozo', type: String })
  @IsNotEmpty()
  lastName?: string;

  @IsString()
  @ApiProperty({ example: 'Esta es mi biografía', type: String })
  @IsOptional()
  bio?: string;

  @IsUrl()
  @IsOptional()
  image?: string;
}
