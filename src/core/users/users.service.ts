import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { NullableType } from '../utils/types/nullable.type';
import { PrismaService } from '../prisma/prisma.service';
import { UserException } from './users.exception';
import { LoggerService } from '../logger/logger.service';
import { StorageService } from '../storage/storage.service';
import { UserResponseDto } from './dto/user.response.dto';


@Injectable()
export class UsersService {

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private storageService: StorageService,
    private readonly logger: LoggerService,
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
    this.logger.error('Error al crear usuario', error, 'UsersService');

    if (error instanceof UserException) throw error;

    throw new UserException(defaultMessage, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * Crea un nuevo usuario en el sistema
   * @param userDto - Datos del usuario a crear
   * @throws {UserException} Si el correo ya existe
   * @returns {Promise<UserEntity>} Usuario creado
   */
  async createUser(userDto: CreateUserDto): Promise<UserResponseDto>  {
    try {
      this.logger.log('Creating new user', 'UsersService');

      await this.validateNewUser(userDto);

      const hashedPassword = await this.hashPassword(userDto.password);
      
      const user = await this.prisma.user.create({
        data: {
          ...userDto,
          password: hashedPassword,
        },
      });

      this.logger.log(`Usuario creado exitosamente: ${user.email}`);
      return Object.assign(new UserResponseDto(), user);
    } catch (error) {
      this.handleError(error, 'Error al crear usuario');
    }
  }

  /**
   * Obtiene todos los usuarios del sistema excepto el usuario actual
   * @param userId - ID del usuario actual que se excluirá de los resultados
   * @param queryParam - Parámetro opcional para filtrar usuarios por email, nombre o apellido
   * @throws {UserException} Si hay un error al obtener los usuarios
   * @returns {Promise<UserResponseDto[]>} Lista de usuarios encontrados
   */

  async getAll(userId: string, queryParam: string = ''): Promise<UserResponseDto[]> {
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

      const usersWithPhotos = await Promise.all(users.map(async user => ({
        ...new UserResponseDto(),
        ...user,
        image: await this.getProfilePhotoUrl(user.id)
      })));
      
      return usersWithPhotos;
    } catch (error) {
      this.handleError(error, 'Error al obtener usuarios');
    }
  }
  
  /**
   * Obtiene un usuario por su ID
   * @param id - ID del usuario a buscar
   * @returns {Promise<NullableType<User>>} Usuario encontrado o null si no existe
   */
  async findById(id: User['id']): Promise<NullableType<User>> {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Obtiene un usuario por su email
   * @param email - Email del usuario a buscar
   * @returns {Promise<NullableType<User>>} Usuario encontrado o null si no existe
   */
  async findByEmail(email: User['email']): Promise<NullableType<User>> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Actualiza un usuario existente
   * @param id - ID del usuario a actualizar
   * @param data - Datos del usuario a actualizar
   * @returns {Promise<UserResponseDto>} Usuario actualizado
   */
  async updateUser(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    if (data.password) {
      data.password = await bcrypt.hash(
        data.password,
        this.configService.get<number>('auth.hashing'),
      );
    }
    this.logger.log(`Actualizando usuario con ID: ${id}`);
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
    this.logger.log(`Usuario eliminado con ID: ${id}`);
    return user.delete_at !== null;
    
  }

  async updateProfilePhoto(userId: string, file: Express.Multer.File): Promise<void> {
    try {
      this.logger.log(`Updating profile photo for user: ${userId}`);
  
      // Validar tipo de archivo
      if (!this.configService.get<string[]>('storage.profilePhotos.allowedTypes').includes(file.mimetype)) {
        throw new HttpException(
          'Invalid file type for profile photo',
          HttpStatus.BAD_REQUEST
        );
      }
  
      // Validar tamaño
      if (file.size > this.configService.get<number>('storage.profilePhotos.maxSize')) {
        throw new HttpException(
          'File size exceeds maximum allowed for profile photos',
          HttpStatus.BAD_REQUEST
        );
      }
  
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { image: true },
      });
  
      // Eliminar foto anterior
      if (user?.image) {
        await this.storageService.deleteFile(user.image);
      }
  
      // Guardar nueva foto
      const filePath = await this.storageService.saveFile(
        file,
        'profile-photos'
      );
  
      // Actualizar usuario
      await this.prisma.user.update({
        where: { id: userId },
        data: { image: filePath },
      });
  
      this.logger.log(`Profile photo updated successfully for user: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to update profile photo', error.stack);
      throw error;
    }
  }

  /**
   * Elimina la foto de perfil del usuario
   * @param userId - ID del usuario
   * @throws {HttpException} Si ocurre un error al eliminar
   */
  async deleteProfilePhoto(userId: string): Promise<void> {
    try {
      this.logger.log(`Attempting to delete profile photo for user: ${userId}`, 'UsersService');

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { image: true }
      });

      if (!user?.image) {
        this.logger.log('No profile photo to delete', 'UsersService');
        return;
      }

      // Eliminar archivo del almacenamiento
      await this.storageService.deleteFile(user.image);

      // Actualizar usuario
      await this.prisma.user.update({
        where: { id: userId },
        data: { image: null }
      });

      this.logger.log(`Profile photo deleted successfully for user: ${userId}`, 'UsersService');
    } catch (error) {
      this.logger.error('Failed to delete profile photo', error.stack, 'UsersService');
      throw new HttpException(
        'Error al eliminar foto de perfil',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtiene la URL de la foto de perfil del usuario
   * @param userId - ID del usuario
   * @returns URL de la foto de perfil
   */
  async getProfilePhotoUrl(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { image: true, name: true }
      });

      if (!user) {
        throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
      }

      if (user.image) {
        return this.storageService.getFileUrl(user.image);
      }

      return this.getDefaultProfilePhotoUrl(user.name);
    } catch (error) {
      this.logger.error('Failed to get profile photo URL', error.stack, 'UsersService');
      throw error;
    }
  }

  /**
   * Genera una URL para la foto de perfil por defecto
   * @param name - Nombre del usuario
   * @returns URL de la foto de perfil por defecto
   */
  private getDefaultProfilePhotoUrl(name: string): string {
    const initials = name
      .split(' ')
      .map(segment => segment.charAt(0))
      .join('')
      .toUpperCase();

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&color=7F9CF5&background=EBF4FF`;
  }

}
