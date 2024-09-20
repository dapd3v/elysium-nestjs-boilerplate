import { Session } from "@prisma/client";

export type JwtRefreshPayloadType = {
  sessionId: Session['id'];
  hash: Session['sessionToken'];
  iat: number;
  exp: number;
};