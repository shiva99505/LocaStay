import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../lib/types';
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requireRole(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireLandlord: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireTenant: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map