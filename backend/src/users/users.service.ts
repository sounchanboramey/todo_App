import * as argon2 from 'argon2';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      username: dto.username,
      email: dto.email.trim().toLowerCase(),
      passwordHash: await argon2.hash(dto.password),
    });
    return this.save(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (dto.username !== undefined) user.username = dto.username;
    if (dto.email !== undefined) user.email = dto.email.trim().toLowerCase();
    return this.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  private async save(user: User): Promise<User> {
    try {
      const saved = await this.usersRepository.save(user);
      return {
        id: saved.id,
        username: saved.username,
        email: saved.email,
        role: saved.role,
      } as User;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        error.driverError?.code === '23505'
      ) {
        throw new ConflictException('Username or email already exists');
      }
      throw error;
    }
  }
}
