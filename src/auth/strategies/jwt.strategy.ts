import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserType } from '../../common/enums/user-type.enum';
import { jwtConstants } from '../constants';

export interface JwtPayload {
  sub: string;
  email: string;
  user_type: UserType;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  user_type: UserType;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
      user_type: payload.user_type,
    };
  }
}
