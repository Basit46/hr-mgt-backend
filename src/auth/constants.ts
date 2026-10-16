import type { StringValue } from 'ms';

export const jwtConstants: { secret: string; expiresIn: StringValue } = {
  secret: process.env.JWT_SECRET ?? 'hr-mgt-dev-secret',
  expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as StringValue,
};
