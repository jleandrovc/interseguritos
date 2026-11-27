'use strict';

const Joi = require('joi');

const scalarValue = Joi.alternatives()
  .try(Joi.string().max(500).allow(''), Joi.number(), Joi.boolean())
  .allow(null);

const translateRequestSchema = Joi.object({
  producto: Joi.string().trim().min(1).max(60).required(),
  tipoEndoso: Joi.string().trim().min(1).max(60).required(),
})
  .pattern(Joi.string().max(80), scalarValue)
  .max(100)
  .label('TranslateRequest');

class TranslateRequest {
  constructor(payload) {
    this.productCode = payload.producto;
    this.endorsementTypeCode = payload.tipoEndoso;
    this.fields = Object.freeze({ ...payload });
  }
}

module.exports = { TranslateRequest, translateRequestSchema };
