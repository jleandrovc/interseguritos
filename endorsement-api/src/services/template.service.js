'use strict';

const { TemplateNotFoundError } = require('../errors/domain-errors');
const { toTemplateEntity } = require('../mappers/template.mapper');

class TemplateService {
  #repository;
  #cacheTtlMs;
  #now;
  #cache = new Map();

  constructor({ templateRepository, cacheTtlMs = 0, now = Date.now }) {
    this.#repository = templateRepository;
    this.#cacheTtlMs = cacheTtlMs;
    this.#now = now;
  }

  async getActiveTemplate(productCode, endorsementTypeCode) {
    const key = `${productCode}\u0000${endorsementTypeCode}`;
    const cached = this.#cache.get(key);
    if (cached && cached.expiresAt > this.#now()) return cached.template;

    const model = await this.#repository.findActive(productCode, endorsementTypeCode);
    if (!model) throw new TemplateNotFoundError(productCode, endorsementTypeCode);

    const template = toTemplateEntity(model);
    if (this.#cacheTtlMs > 0) {
      this.#cache.set(key, { template, expiresAt: this.#now() + this.#cacheTtlMs });
    }
    return template;
  }
}

module.exports = { TemplateService };
