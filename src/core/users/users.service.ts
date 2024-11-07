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

  /**
   * Crea un nuevo usuario en el sistema
   * @param password - Contraseña a hasehar
   * @throws {UserException} Error al enciptar la contraseña
   * @returns {Promise<String>} Contraseña hasheada
   */
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
  
  /**
   * Crea un nuevo usuario en el sistema
   * @param userDto - Datos del usuario a validar
   * @throws {UserException} Si el correo ya existe
   * @returns {Promise<void>} Devuelve True o False
   */  
  private async validateNewUser(userDto: CreateUserDto): Promise<void> {
    const existingUser = await this.findByEmail(userDto.email);
    if (existingUser) {
      throw new UserException(
        'El correo electrónico ya está registrado',
        HttpStatus.CONFLICT
      );
    }
  }

  /**
   * Crea un nuevo usuario en el sistema
   * @param error - Erro generado en instancia
   * @param defaulMessage - Mensaje a mostrar al usuario
   * @throws {UserException} Si el correo ya existe
   * @returns {never}
   */
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

  /**
   * Obtiene todos los usuarios del sistema excepto el usuario actual
   * @param userId - ID del usuario actual que se excluirá de los resultados
   * @param queryParam - Parámetro opcional para filtrar usuarios por email, nombre o apellido
   * @throws {UserException} Si hay un error al obtener los usuarios
   * @returns {Promise<UserEntity[]>} Lista de usuarios encontrados
   */

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
  
  /**
   * Obtiene un usuario por su ID
   * @param id - ID del usuario a buscar
   * @returns {Promise<NullableType<User>>} Usuario encontrado o null si no existe
   */
  async findById(id: UserEntity['id']): Promise<NullableType<User>> {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Obtiene un usuario por su email
   * @param email - Email del usuario a buscar
   * @returns {Promise<NullableType<UserEntity>>} Usuario encontrado o null si no existe
   */
  async findByEmail(email: UserEntity['email']): Promise<NullableType<UserEntity>> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Actualiza un usuario existente
   * @param id - ID del usuario a actualizar
   * @param data - Datos del usuario a actualizar
   * @returns {Promise<UserEntity>} Usuario actualizado
   */
  async updateUser(id: string, data: UpdateUserDto): Promise<UserEntity> {
    if (data.password) {
      data.password = await bcrypt.hash(
        data.password,
        this.configService.get<number>('auth.hashing'),
      );
    }

    return this.prisma.user.update({ where: { id }, data });
  }
  
  /**
   * Elimina un usuario
   * @param id - ID del usuario a eliminar
   * @returns {Promise<boolean>} True si el usuario se eliminó correctamente, false si no
   */
  async delete(id: string): Promise<boolean> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { delete_at: new Date() },
    });

    return user.delete_at !== null;
    
  }

}
