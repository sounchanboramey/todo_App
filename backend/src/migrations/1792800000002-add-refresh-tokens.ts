import type { MigrationInterface, QueryRunner } from 'typeorm';
export class AddRefreshTokens1792800000002 implements MigrationInterface {
  name = 'AddRefreshTokens1792800000002';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "refresh_tokens" (
      "id" uuid NOT NULL PRIMARY KEY,
      "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "tokenHash" character varying NOT NULL,
      "expiresAt" timestamptz NOT NULL
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "refresh_tokens"');
  }
}
