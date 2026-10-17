import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { Profile } from './entities/profile.entity.js';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async getProfile(): Promise<Profile> {
    const profile = await this.profileRepository.findOne({ where: {} });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async updateProfile(updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const profile = await this.getProfile();
    Object.assign(profile, updateProfileDto);
    return this.profileRepository.save(profile);
  }
}
