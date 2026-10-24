import { AuthModule } from './auth/auth.module.js';

import { Module } from '@nestjs/common';
import { databaseConfig } from './database.config.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TodosController } from './todos/todos.controller.js';
import { TodosService } from './todos/todos.service.js';
import { Todo } from './todos/entities/todo.entity.js';
import { ProfileController } from './profile/profile.controller.js';
import { ProfileService } from './profile/profile.service.js';
import { Profile } from './profile/entities/profile.entity.js';
import { User } from './users/entities/user.entity.js';
import { UsersController } from './users/users.controller.js';
import { UsersService } from './users/users.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forRoot({
      ...databaseConfig,
      autoLoadEntities: true,
      // Migrations handle the schema — don't use synchronize in production.
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Todo, Profile, User]),
  ],
  controllers: [
    AppController,
    TodosController,
    ProfileController,
    UsersController,
  ],
  providers: [AppService, TodosService, ProfileService, UsersService],
})
export class AppModule {}
