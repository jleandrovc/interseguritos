'use strict';

const Joi = require('joi');

const databaseSchema = Joi.object({
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().default('endorsements'),
  DB_USER: Joi.string().default('endorsements'),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_SSL: Joi.boolean().default(false),
  DB_MIGRATIONS_RUN: Joi.boolean().default(false),
}).unknown(true);

const appSchema = databaseSchema.keys({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  HOST: Joi.string().default('0.0.0.0'),
  PORT: Joi.number().port().default(3000),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ISSUER: Joi.string().default('interseguritos'),
  JWT_AUDIENCE: Joi.string().default('interseguritos-apis'),
  JWT_TTL_SEC: Joi.number().integer().min(60).default(3600),
  API_CLIENT_ID: Joi.string().required(),
  API_CLIENT_SECRET: Joi.string().min(16).required(),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
  DOCS_ENABLED: Joi.boolean().default(true),
  TEMPLATE_CACHE_TTL_MS: Joi.number().integer().min(0).default(60000),
});

function validate(schema, env) {
  const { value, error } = schema.validate(env, { abortEarly: false, convert: true });
  if (error) {
    throw new Error(`Invalid configuration: ${error.details.map((d) => d.message).join('; ')}`);
  }
  return value;
}

function toDatabaseConfig(value) {
  return {
    url: value.DATABASE_URL,
    host: value.DB_HOST,
    port: value.DB_PORT,
    database: value.DB_NAME,
    username: value.DB_USER,
    password: value.DB_PASSWORD,
    ssl: value.DB_SSL,
    migrationsRun: value.DB_MIGRATIONS_RUN,
  };
}

function loadDatabaseConfig(env = process.env) {
  return toDatabaseConfig(validate(databaseSchema, env));
}

function loadConfig(env = process.env) {
  const value = validate(appSchema, env);
  return {
    env: value.NODE_ENV,
    server: { host: value.HOST, port: value.PORT },
    db: toDatabaseConfig(value),
    jwt: {
      secret: value.JWT_SECRET,
      issuer: value.JWT_ISSUER,
      audience: value.JWT_AUDIENCE,
      ttlSec: value.JWT_TTL_SEC,
    },
    client: { id: value.API_CLIENT_ID, secret: value.API_CLIENT_SECRET },
    cors: { origins: value.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean) },
    docsEnabled: value.DOCS_ENABLED,
    templateCacheTtlMs: value.TEMPLATE_CACHE_TTL_MS,
  };
}

module.exports = { loadConfig, loadDatabaseConfig };
