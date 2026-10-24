import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { Todo } from './entities/todo.entity.js';
import { TodosService } from './todos.service.js';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/role.js';

@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<Todo[]> {
    return this.todosService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<Todo> {
    return this.todosService.findOne(id, user.id);
  }

  @Post()
  create(
    @Body() createTodoDto: CreateTodoDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Todo> {
    return this.todosService.create(createTodoDto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTodoDto: UpdateTodoDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Todo> {
    return this.todosService.update(id, updateTodoDto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.todosService.remove(id, user.id);
  }
}
