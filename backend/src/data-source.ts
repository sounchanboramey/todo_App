import { DataSource } from "typeorm";
export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5433),
  username: process.env.DB_USERNAME ?? "postgres",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_DATABASE ?? "todo",
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/migrations/1792210226264-init.ts"],
});
