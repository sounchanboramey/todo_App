import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1792210226264 implements MigrationInterface {
    name = 'Init1792210226264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "profile" ("id" SERIAL NOT NULL, "username" character varying(100) NOT NULL, "displayName" character varying(160) NOT NULL, "email" character varying(255) NOT NULL, CONSTRAINT "UQ_d80b94dc62f7467403009d88062" UNIQUE ("username"), CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "todo" ("id" SERIAL NOT NULL, "title" character varying(200) NOT NULL, "status" character varying NOT NULL DEFAULT 'TODO', "priority" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d429b7114371f6a35c5cb4776a7" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "todo"`);
        await queryRunner.query(`DROP TABLE "profile"`);
    }

}

