import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { refreshCookieName } from './auth.config.js';
import type { AuthUser } from './role.js';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.checkOrigin(req);
    return this.authService.login(dto, res);
  }
  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.checkOrigin(req);
    return this.authService.refresh(req.cookies?.[refreshCookieName], res);
  }
  @Post('logout')
  @HttpCode(204)
  logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.checkOrigin(req);
    return this.authService.logout(user.id, res);
  }
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
  private checkOrigin(req: Request) {
    const allowed = (
      process.env.FRONTEND_ORIGINS ??
      'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175'
    )
      .split(',')
      .map((origin) => origin.trim());
    if (req.headers.origin && !allowed.includes(req.headers.origin))
      throw new ForbiddenException('Origin not allowed');
    if (req.headers['sec-fetch-site'] === 'cross-site')
      throw new ForbiddenException('Cross-site request not allowed');
  }
}
