export enum Role {
  User = 'USER',
  Admin = 'ADMIN',
}
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: Role;
}
