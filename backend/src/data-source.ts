import { databaseConfig } from './database.config.js';
import { DataSource } from 'typeorm';
export default new DataSource({
  ...databaseConfig,
  entities: ['src/**/*.entity.ts'],
  migrations: [
    'src/migrations/1792210226264-init.ts',
    'src/migrations/1792800000000-add-users.ts',
    'src/migrations/1792800000001-add-user-passwords.ts',
    'src/migrations/1792800000002-add-refresh-tokens.ts',
    'src/migrations/1792800000003-add-roles-and-todo-owners.ts',
  ],
});
