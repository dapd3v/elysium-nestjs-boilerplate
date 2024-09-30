import { HttpStatus, Injectable, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { SessionService } from '../session/session.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { Session, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import * as ms from 'ms'
import { hashGenerator } from '../utils/hashGenerator';
import { JwtRefreshPayloadType } from './types/jwt-refresh-payload.type';
import { NullableType } from '../utils/types/nullable.type';
import { JwtPayloadType } from './types/jwt-payload.type';
import { AuthUpdateDto } from './dto/auth-update.dto';

@Injectable()
export class AuthService {

  constructor(
    private sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async validateLogin(loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    const userData = await this.usersService.findByEmail(loginDto.email);

    if (!userData) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'EMAIL_NOT_EXISTS',
        },
      });
    }

    if (!userData.password) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'INCORRECT_PASSWORD',
        },
      });
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      userData.password,
    );

    if (!isValidPassword) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'incorrectPassword',
        },
      });
    }

    const hash = hashGenerator();
      
    const dataSession = {
      sessionToken: hash,
      userId: userData.id,
      expires: new Date(Date.now() + ms(this.configService.getOrThrow('auth.expires'))),
    };

    const session =await this.sessionService.create(dataSession);

    const { access_token, refresh_token, expires_in } = await this.getTokensData({
      id: userData.id,
      sessionId: session.id,
      hash,
    });

    const updatedSession = {
      ...session,
      access_token: access_token,
      refresh_token: refresh_token,
      expires_at: expires_in, 
    };

    await this.sessionService.update(session.id, updatedSession);

    const user = {
      name: userData.name,
      lastName: userData.lastName,
      email: userData.email,
      image: userData.image,
    };

    return {
      access_token,
      refresh_token,
      expires_in,
      user,
    };
  }
  
  async register(dto: AuthRegisterLoginDto): Promise<void> {
    const user = await this.usersService.createUser({
      ...dto,
      email: dto.email,
    });

    const hash = await this.jwtService.signAsync(
      {
        confirmEmailUserId: user.id,
      },
      {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );

    await this.mailService.userSignUp({
      to: dto.email,
      data: {
        hash,
      },
    });
  }

  async confirmEmail(hash: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `INVALID_OR_EXPIRED_HASH`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (
      !user ||
      !(user.emailVerified instanceof Date) // Verifica que sea una fecha válida
    ) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `NOT_FOUND`,
      });
    }

    user.emailVerified = new Date();

    await this.usersService.updateUser(user.id, user);
  }

  async confirmNewEmail(hash: string): Promise<void> {
    let userId: User['id'];
    let newEmail: User['email'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
        newEmail: User['email'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
      newEmail = jwtData.newEmail;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    user.email = newEmail;
    user.emailVerified = null;


    await this.usersService.updateUser(user.id, user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'EMAIL_NOT_EXISTS',
        },
      });
    }

    const tokenExpiresIn = this.configService.getOrThrow('auth.forgotExpires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const hash = await this.jwtService.signAsync(
      {
        forgotUserId: user.id,
      },
      {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
        expiresIn: tokenExpiresIn,
      },
    );

    await this.mailService.forgotPassword({
      to: email,
      data: {
        hash,
        tokenExpires,
      },
    });
  }

  async resetPassword(hash: string, password: string): Promise<void> {
    let userId: User['id'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        forgotUserId: User['id'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.forgotSecret', {
          infer: true,
        }),
      });

      userId = jwtData.forgotUserId;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `IVALID_OR_EXPIRED_HASH`,
        },
      });
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `NOT_FOUND`,
        },
      });
    }

    user.password = password;

    await this.usersService.updateUser(user.id, user);
  }
  
  async refreshToken( data: Pick<JwtRefreshPayloadType, 'sessionId' | 'hash'> ): Promise<Omit<LoginResponseDto, 'user'>> {
    const session = await this.sessionService.findOneById(data.sessionId);

    if (!session) {
      throw new UnauthorizedException();
    }

    if (session.sessionToken !== data.hash) {
      throw new UnauthorizedException();
    }

    const hash = hashGenerator();

    const user = await this.usersService.findById(session.userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    await this.sessionService.update(session.id, {
      sessionToken: String(hash),
      userId: session.userId,
      expires: new Date(Date.now() + ms(this.configService.getOrThrow('auth.expires'))),
    });

    const { access_token, refresh_token, expires_in } = await this.getTokensData({
      id: session.userId,
      sessionId: session.id,
      hash,
    });

    return {
      access_token,
      refresh_token,
      expires_in,
    };
  }

  async me(userJwtPayload: JwtPayloadType): Promise<NullableType<User>> {
    return this.usersService.findById(userJwtPayload.id);
  }

  async update(
    userJwtPayload: JwtPayloadType,
    userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    const currentUser = await this.usersService.findById(userJwtPayload.id);

    if (!currentUser) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          user: 'userNotFound',
        },
      });
    }

    if (userDto.password) {
      if (!userDto.oldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'missingOldPassword',
          },
        });
      }

      if (!currentUser.password) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'INCORRECT_OLD_PASSWORD',
          },
        });
      }

      const isValidOldPassword = await bcrypt.compare(
        userDto.oldPassword,
        currentUser.password,
      );

      if (!isValidOldPassword) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            oldPassword: 'INCORRECT_OLD_PASSWORD',
          },
        });
      } else {
        await this.sessionService.deleteByUserIdWithExclude({
          userId: currentUser.id,
          excludeSessionId: userJwtPayload._sId          
        });
      }
    }

    if (userDto.email && userDto.email !== currentUser.email) {
      const userByEmail = await this.usersService.findByEmail(userDto.email);

      if (userByEmail && userByEmail.id !== currentUser.id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailExists',
          },
        });
      }

      const hash = await this.jwtService.signAsync(
        {
          confirmEmailUserId: currentUser.id,
          newEmail: userDto.email,
        },
        {
          secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
            infer: true,
          }),
        },
      );

      await this.mailService.confirmNewEmail({
        to: userDto.email,
        data: {
          hash,
        },
      });
    }

    delete userDto.email;
    delete userDto.oldPassword;

    await this.usersService.updateUser(userJwtPayload.id, userDto);

    return this.usersService.findById(userJwtPayload.id);
  }

  async logout(data: Pick<JwtRefreshPayloadType, 'sessionId'>) {
    return this.sessionService.deleteById(data.sessionId);
  }

  private async getTokensData(data: {
    sessionId: Session['id'];
    id: User['id'];
    hash: Session['sessionToken'];
  }) {
    // Obtener el tiempo de expiración del token desde la configuración
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });
  
    // Calcular la fecha de expiración del token en milisegundos
    const expires_in = Date.now() + ms(tokenExpiresIn);
  
    // Generar el token y el refreshToken usando la configuración
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        {
          _pk: data.id,
          _sId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: expires_in,
        },
      ),
      this.jwtService.signAsync(
        {
          _sId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);
  
    return {
      access_token,
      refresh_token,
      expires_in,
    };
  }
  
}
