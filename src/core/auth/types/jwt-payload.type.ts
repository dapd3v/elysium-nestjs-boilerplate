import { Session, User } from '@prisma/client';

export type JwtPayloadType = Pick<User, 'id'> & {
  _pk: User['id'];
  _sId: Session['id'];
  iat: number;
  exp: number;
};
