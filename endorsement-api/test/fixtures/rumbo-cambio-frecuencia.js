'use strict';

// Mirrors the seed migration so the PDF example can be verified without a database.
const templateModel = () => ({
  id: 1,
  version: 1,
  eventDescription: 'SolicitarEndoso',
  active: true,
  product: { id: 1, code: 'Rumbo', name: 'Rumbo' },
  endorsementType: { id: 1, code: 'CambioFrecuencia', name: 'Cambio de frecuencia de pago' },
  rootFields: [
    { sortOrder: 1, targetPath: 'policyNumber', kind: 'FIELD', sourceField: 'policyNumber', defaultValue: null, required: true },
    { sortOrder: 2, targetPath: 'idEnvio', kind: 'FIELD', sourceField: 'idEnvio', defaultValue: null, required: true },
    { sortOrder: 3, targetPath: 'financialPlansEntity.description', kind: 'FIELD', sourceField: 'frecuencia', defaultValue: null, required: true },
    { sortOrder: 4, targetPath: 'currency.description', kind: 'FIELD', sourceField: 'moneda', defaultValue: null, required: true },
    { sortOrder: 5, targetPath: 'productEntity.description', kind: 'FIELD', sourceField: 'producto', defaultValue: null, required: true },
    { sortOrder: 6, targetPath: 'eventEntity', kind: 'EVENT_ENTITY', sourceField: null, defaultValue: null, required: false },
    { sortOrder: 7, targetPath: 'eventAppliedEntities', kind: 'APPLIED_EVENTS', sourceField: null, defaultValue: null, required: false },
    { sortOrder: 8, targetPath: 'riskUnitEntities[0].insuranceObjectEntities[0].insuranceObjectNumber', kind: 'FIELD', sourceField: null, defaultValue: '1', required: false },
    { sortOrder: 9, targetPath: 'riskUnitEntities[0].insuranceObjectEntities[0].coverageEntities', kind: 'FIELD', sourceField: null, defaultValue: [], required: false },
    { sortOrder: 10, targetPath: 'riskUnitEntities[0].insuranceObjectEntities[0].participationEntities', kind: 'FIELD', sourceField: null, defaultValue: [], required: false },
    { sortOrder: 11, targetPath: 'riskUnitEntities[0].plansEntity.description', kind: 'FIELD', sourceField: 'plan', defaultValue: null, required: true },
    { sortOrder: 12, targetPath: 'riskUnitEntities[0].riskUnitNumber', kind: 'FIELD', sourceField: null, defaultValue: '1', required: false },
    { sortOrder: 13, targetPath: 'participationEntities', kind: 'FIELD', sourceField: null, defaultValue: [], required: false },
  ],
  dynamicFields: [
    { sortOrder: 1, label: 'ProductosVida', sourceField: 'producto', defaultValue: null, required: true },
    { sortOrder: 2, label: 'NombreUsuario', sourceField: 'usuario', defaultValue: null, required: true },
    { sortOrder: 3, label: 'NumeroPolizaEndoso', sourceField: 'policyNumber', defaultValue: null, required: true },
    { sortOrder: 4, label: 'TipoEndosoPol', sourceField: null, defaultValue: 'Endoso Simple', required: false },
    { sortOrder: 5, label: 'ResponsableAtencion', sourceField: null, defaultValue: 'SAC', required: false },
    { sortOrder: 6, label: 'EndosoModifPrima', sourceField: null, defaultValue: 'Si', required: false },
    { sortOrder: 7, label: 'InicioVigenciaEndoso', sourceField: null, defaultValue: 'Default', required: false },
    { sortOrder: 8, label: 'TipoVigenciaEndoso', sourceField: null, defaultValue: '', required: false },
    { sortOrder: 9, label: 'EndososSimplesSACRumbo', sourceField: null, defaultValue: 'TES008', required: false },
    { sortOrder: 10, label: 'FechaSolicitud', sourceField: 'fechaSolicitud', defaultValue: null, required: true },
    { sortOrder: 11, label: 'FechaCliente', sourceField: 'fechaCliente', defaultValue: null, required: true },
    { sortOrder: 12, label: 'FechaEfectiva', sourceField: 'fechaEfectiva', defaultValue: null, required: true },
  ],
  events: [
    { orderEvent: 2, description: 'AprobarEndoso' },
    { orderEvent: 1, description: 'SolicitarEndoso' },
  ],
});

const pdfInput = () => ({
  policyNumber: '08200000049',
  idEnvio: 5984,
  frecuencia: 'Semestral',
  tipoEndoso: 'CambioFrecuencia',
  producto: 'Rumbo',
  plan: 'PlanRumbo',
  moneda: 'Nuevo Sol',
  usuario: 'interface.servicios',
  fechaSolicitud: '2025-08-27',
  fechaCliente: '2025-08-27',
  fechaEfectiva: '2025-09-01',
});

const pdfExpectedOutput = () => ({
  policyNumber: '08200000049',
  idEnvio: 5984,
  financialPlansEntity: { description: 'Semestral' },
  currency: { description: 'Nuevo Sol' },
  productEntity: { description: 'Rumbo' },
  eventEntity: {
    description: 'SolicitarEndoso',
    dynamicData: [
      { etiqueta: 'ProductosVida', value: 'Rumbo' },
      { etiqueta: 'NombreUsuario', value: 'interface.servicios' },
      { etiqueta: 'NumeroPolizaEndoso', value: '08200000049' },
      { etiqueta: 'TipoEndosoPol', value: 'Endoso Simple' },
      { etiqueta: 'ResponsableAtencion', value: 'SAC' },
      { etiqueta: 'EndosoModifPrima', value: 'Si' },
      { etiqueta: 'InicioVigenciaEndoso', value: 'Default' },
      { etiqueta: 'TipoVigenciaEndoso', value: '' },
      { etiqueta: 'EndososSimplesSACRumbo', value: 'TES008' },
      { etiqueta: 'FechaSolicitud', value: '2025-08-27' },
      { etiqueta: 'FechaCliente', value: '2025-08-27' },
      { etiqueta: 'FechaEfectiva', value: '2025-09-01' },
    ],
  },
  eventAppliedEntities: [
    { description: 'SolicitarEndoso', orderEvent: 1 },
    { description: 'AprobarEndoso', orderEvent: 2 },
  ],
  riskUnitEntities: [
    {
      insuranceObjectEntities: [
        { insuranceObjectNumber: '1', coverageEntities: [], participationEntities: [] },
      ],
      plansEntity: { description: 'PlanRumbo' },
      riskUnitNumber: '1',
    },
  ],
  participationEntities: [],
});

module.exports = { templateModel, pdfInput, pdfExpectedOutput };
