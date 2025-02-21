export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface LoggerConfig {
  level: string;
  directory: string;
  maxFiles: string;
  maxSize: string;
}

export interface AuthConfig {
  jwtSecret: string;
  tokenExpiration: string;
}

export interface Config {
  api: ApiConfig;
  db: DbConfig;
  logger: LoggerConfig;
  auth: AuthConfig;
}
