import { Controller, Get, Post, Body, Patch, Param, Delete, SerializeOptions, HttpCode, HttpStatus, Query, Req, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity';
import { Role } from '../auth/enums/role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { UploadFile } from '../storage/decorators/upload.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiCreatedResponse({
    type: UserEntity,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post()
  @Auth(Role.ADMIN, Role.USER)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto):Promise<UserEntity> {
    return this.usersService.createUser(createUserDto);
  }

  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  findAll( 
    @Req() req, 
    @Query('query') query,
  ) {

    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    
    if (limit > 50) {
      limit = 50;
    }

    return this.usersService.getAll(req.user._pk, query);
  }

  @ApiOkResponse({
    type: UserEntity,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  findOne(@Param('id') id: UserEntity['id']) {
    return this.usersService.findById(id);
  }

  @ApiOkResponse({
    type: UserEntity,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  update(@Param('id') id: UserEntity['id'], @Body() updateUserDto: UpdateUserDto): Promise<UserEntity | null> {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: UserEntity['id']): Promise<boolean> {
    return this.usersService.delete(id);
  }

  @Delete('profile-photo')
  @Auth(Role.USER)
  async deleteProfilePhoto(@Req() req: any) {
    await this.usersService.deleteProfilePhoto(req.user._pk);
  }

  @Get('profile-photo')
  @Auth(Role.USER)
  async getProfilePhoto(@Req() req: any) {
    return {
      url: await this.usersService.getProfilePhotoUrl(req.user._pk)
    };
  }

  @Post('profile-photo')
  @Auth(Role.USER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UploadFile('file', 'profile-photos')
  async uploadProfilePhoto(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    try {
      await this.usersService.updateProfilePhoto(req.user._pk, file);
      return { message: 'Profile photo updated successfully' };
    } catch (error) {
      throw error;
    }
  }
}
