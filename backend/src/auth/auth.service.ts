import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import {
  authConfig,
  refreshCookieName,
  refreshCookieOptions,
} from './auth.config.js';
type RefreshPayload = { sub: number; jti: string; type: string };
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
  ) {}
  signup(dto: SignupDto) {
    return this.usersService.create(dto);
  }
  async login(dto: LoginDto, res: Response) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email.trim().toLowerCase() },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });
    if (
      !user?.passwordHash ||
      !(await argon2.verify(user.passwordHash, dto.password))
    )
      throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user, res);
  }
  async issueTokens(user: User, res: Response) {
    const id = randomUUID();
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      type: 'access',
    });
    const refresh = await this.jwt.signAsync(
      { sub: user.id, jti: id, type: 'refresh' },
      {
        secret: authConfig.refreshSecret,
        expiresIn: authConfig.refreshSeconds,
      },
    );
    await this.refreshTokens.save(
      this.refreshTokens.create({
        id,
        userId: user.id,
        tokenHash: await argon2.hash(refresh),
        expiresAt: new Date(Date.now() + authConfig.refreshSeconds * 1000),
      }),
    );
    res.cookie(refreshCookieName, refresh, {
      ...refreshCookieOptions,
      maxAge: authConfig.refreshSeconds * 1000,
    });
    return { accessToken };
  }
  private async readRefresh(token: unknown) {
    if (typeof token !== 'string' || !token || token.length > 4096)
      throw new UnauthorizedException('Invalid refresh token');
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: authConfig.refreshSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (
      payload.type !== 'refresh' ||
      !Number.isInteger(payload.sub) ||
      typeof payload.jti !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(payload.jti)
    )
      throw new UnauthorizedException('Invalid refresh token');
    const session = await this.refreshTokens.findOne({
      where: { id: payload.jti, userId: payload.sub },
      select: { id: true, userId: true, tokenHash: true, expiresAt: true },
    });
    if (
      !session ||
      session.expiresAt.getTime() <= Date.now() ||
      !(await argon2.verify(session.tokenHash, token))
    )
      throw new UnauthorizedException('Invalid refresh token');
    return session;
  }
  async refresh(token: unknown, res: Response) {
    const session = await this.readRefresh(token);
    const user = await this.usersRepository.findOneBy({ id: session.userId });
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    // A conditional delete lets only one request consume this refresh token.
    const consumed = await this.refreshTokens.delete({
      id: session.id,
      tokenHash: session.tokenHash,
    });
    if (consumed.affected !== 1)
      throw new UnauthorizedException('Invalid refresh token');
    return this.issueTokens(user, res);
  }
  async logout(userId: number, res: Response) {
    await this.refreshTokens.delete({ userId });
    res.clearCookie(refreshCookieName, refreshCookieOptions);
  }
}
