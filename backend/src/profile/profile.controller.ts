import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { Profile } from './entities/profile.entity.js';
import { ProfileService } from './profile.service.js';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(): Promise<Profile> {
    return this.profileService.getProfile();
  }

  @Patch()
  updateProfile(@Body() updateProfileDto: UpdateProfileDto): Promise<Profile> {
    return this.profileService.updateProfile(updateProfileDto);
  }
}
