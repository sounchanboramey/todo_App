import type { MigrationInterface, QueryRunner } from 'typeorm';
export class AddRolesAndTodoOwners1792800000003 implements MigrationInterface {
  name = 'AddRolesAndTodoOwners1792800000003';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" character varying NOT NULL DEFAULT 'USER' CHECK ("role" IN ('USER', 'ADMIN'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "todo" ADD "ownerId" integer REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_todo_ownerId" ON "todo" ("ownerId")`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "todo" DROP COLUMN "ownerId"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "role"');
  }
}
