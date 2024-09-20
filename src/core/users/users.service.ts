import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { NullableType } from '../utils/types/nullable.type';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class UsersService {

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createUser(userDto: CreateUserDto): Promise<UserEntity>  {
    const isUserAlreadyExist = await this.findByEmail(userDto.email);

    let hashedPassword: string;

    if (isUserAlreadyExist) throw new HttpException('USER_ALREADY_EXIST', HttpStatus.BAD_REQUEST);
    
    try {
        hashedPassword = await bcrypt.hash(
            userDto.password,
            this.configService.get<number>('auth.hashing'),
        );
    } catch (error) {
        throw new HttpException('INTERNAL_SERVER_ERROR', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    userDto.password = hashedPassword;

    const user = await this.prisma.user.create({
      data: userDto,
    });

    return user;
  }

  async getAll(userId: string, queryParam: string = 'tes'): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: {
        uuid: { not: userId }, // Excluir usuarios con el mismo uuid
        OR: [
          { email: { contains: queryParam, mode: 'insensitive' } },
          { name: { contains: queryParam, mode: 'insensitive' } },
          { lastName: { contains: queryParam, mode: 'insensitive' } },
        ],
        delete_at: null, // Excluir usuarios "borrados suavemente"
      },
      orderBy: {
        createdAt: 'desc', // Ordenar por fecha de creación
      },
    });
  
    return users.map(user => new UserEntity(user));
  }
  
  async findById(id: UserEntity['id']): Promise<NullableType<User>> {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: UserEntity['email']): Promise<NullableType<UserEntity>> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<UserEntity> {
    if (data.password) {
      data.password = await bcrypt.hash(
        data.password,
        this.configService.get<number>('auth.hashing'),
      );
    }

    return this.prisma.user.update({ where: { id }, data });
  }
  
  async delete(id: string): Promise<boolean> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { delete_at: new Date() },
    });

    return user.delete_at !== null;
    
  }

}
