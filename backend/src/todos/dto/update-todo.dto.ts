import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTodoDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsIn(['TODO', 'IN_PROGRESS', 'DONE'])
  @IsOptional()
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';

  @IsBoolean()
  @IsOptional()
  priority?: boolean;
}
