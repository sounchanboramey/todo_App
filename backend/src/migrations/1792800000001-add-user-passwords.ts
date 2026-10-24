import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPasswords1792800000001 implements MigrationInterface {
  name = 'AddUserPasswords1792800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Existing users have no password and cannot log in until one is set.
    await queryRunner.query(
      'ALTER TABLE "users" ADD "passwordHash" character varying',
    );
    await queryRunner.query(
      'UPDATE "users" SET "email" = lower(trim("email"))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "passwordHash"');
  }
}
