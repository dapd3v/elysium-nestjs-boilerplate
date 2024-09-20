import { Controller, Get, Post, Body, Patch, Param, Delete, SerializeOptions, HttpCode, HttpStatus, Query, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity';

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
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto):Promise<UserEntity> {
    return this.usersService.createUser(createUserDto);
  }

  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
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
}
