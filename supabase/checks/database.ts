import { SQL } from "bun";

// The local stack started by `bun run db:start`.
export const openDatabase = () => new SQL("postgres://postgres:postgres@127.0.0.1:54322/postgres");
