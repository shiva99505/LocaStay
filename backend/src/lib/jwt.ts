import jwt from 'jsonwebtoken';

const SECRET  = process.env.JWT_SECRET ?? 'locastay-dev-secret';
const EXPIRES = process.env.JWT_EXPIRES_IN ?? '7d';

export interface JwtPayload {
  sub:   string;   // user id
  email: string;
  role:  string;
  name:  string | null;
  iat?:  number;
  exp?:  number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
