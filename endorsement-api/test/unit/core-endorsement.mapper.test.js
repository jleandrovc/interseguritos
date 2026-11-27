'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CoreEndorsementMapper } = require('../../src/mappers/core-endorsement.mapper');
const { toTemplateEntity } = require('../../src/mappers/template.mapper');
const { templateModel, pdfInput, pdfExpectedOutput } = require('../fixtures/rumbo-cambio-frecuencia');

const mapper = new CoreEndorsementMapper();
const template = toTemplateEntity(templateModel());

test('translates the PDF example with the exact structure and key order', () => {
  const { document, missingFields } = mapper.toCore(template, pdfInput());
  assert.deepEqual(missingFields, []);
  assert.equal(JSON.stringify(document), JSON.stringify(pdfExpectedOutput()));
});

test('reports every missing required field instead of stopping at the first one', () => {
  const input = pdfInput();
  delete input.usuario;
  delete input.plan;
  input.fechaEfectiva = '   ';

  const { missingFields } = mapper.toCore(template, input);

  assert.deepEqual(missingFields, [
    { field: 'usuario', target: 'eventEntity.dynamicData[NombreUsuario]' },
    { field: 'fechaEfectiva', target: 'eventEntity.dynamicData[FechaEfectiva]' },
    { field: 'plan', target: 'riskUnitEntities[0].plansEntity.description' },
  ]);
});

test('input values override template defaults when the field is mapped', () => {
  const custom = templateModel();
  custom.dynamicFields[3] = { ...custom.dynamicFields[3], sourceField: 'tipoEndosoPol' };
  const { document } = mapper.toCore(toTemplateEntity(custom), { ...pdfInput(), tipoEndosoPol: 'Endoso Complejo' });

  const entry = document.eventEntity.dynamicData.find((d) => d.etiqueta === 'TipoEndosoPol');
  assert.equal(entry.value, 'Endoso Complejo');
});

test('array defaults are cloned so documents never share references', () => {
  const first = mapper.toCore(template, pdfInput()).document;
  first.participationEntities.push({ mutated: true });
  const second = mapper.toCore(template, pdfInput()).document;
  assert.deepEqual(second.participationEntities, []);
});

test('fields that are not in the template are ignored', () => {
  const { document } = mapper.toCore(template, { ...pdfInput(), campoExtra: 'x' });
  assert.equal(JSON.stringify(document).includes('campoExtra'), false);
});
