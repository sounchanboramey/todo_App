import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../role.js';
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
