import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { NullableType } from '../utils/types/nullable.type';
import { PrismaService } from '../prisma/prisma.service';
import { UserException } from './users.exception';


@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(
        password,
        this.configService.get<number>('auth.hashing'),
      );
    } catch (error) {
      throw new HttpException(
        'Error al encriptar contraseña',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async validateNewUser(userDto: CreateUserDto): Promise<void> {
    const existingUser = await this.findByEmail(userDto.email);
    if (existingUser) {
      throw new UserException(
        'El correo electrónico ya está registrado',
        HttpStatus.CONFLICT
      );
    }
  }

  private handleError(error: any, defaultMessage: string): never {
    this.logger.error(error);
    if (error instanceof UserException) {
      throw error;
    }
    throw new UserException(defaultMessage, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * Crea un nuevo usuario en el sistema
   * @param userDto - Datos del usuario a crear
   * @throws {UserException} Si el correo ya existe
   * @returns {Promise<UserEntity>} Usuario creado
   */
  async createUser(userDto: CreateUserDto): Promise<UserEntity>  {
    try {
      await this.validateNewUser(userDto);

      const hashedPassword = await this.hashPassword(userDto.password);
      
      const user = await this.prisma.user.create({
        data: {
          ...userDto,
          password: hashedPassword,
        },
      });

      this.logger.log(`Usuario creado exitosamente: ${user.email}`);
      return new UserEntity(user);
    } catch (error) {
      this.handleError(error, 'Error al crear usuario');
    }
  }


  async getAll(userId: string, queryParam: string = ''): Promise<UserEntity[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          uuid: { not: userId },
          delete_at: null,
          OR: [
            { email: { contains: queryParam, mode: 'insensitive' } },
            { name: { contains: queryParam, mode: 'insensitive' } },
            { lastName: { contains: queryParam, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      return users.map(user => new UserEntity(user));
    } catch (error) {
      this.handleError(error, 'Error al obtener usuarios');
    }
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
