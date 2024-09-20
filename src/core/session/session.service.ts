import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Session } from '@prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  // Método para crear una nueva sesión
  async create(data: CreateSessionDto): Promise<Session> {
    return this.prisma.session.create({
      data,
    });
  }

  // Método para obtener una sesión por su ID
  async findOneById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
    });
  }

  // Método para obtener todas las sesiones de un usuario
  async findAllByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId },
    });
  }

  // Método para actualizar una sesión
  async update(id: string, data: CreateSessionDto): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data,
    });
  }

  // Método para eliminar una sesión
  async deleteById(id: string): Promise<Session> {
    return this.prisma.session.delete({
      where: { id },
    });
  }
}
