'use strict';

const TEMPLATE = `(
  SELECT et.id
  FROM endorsement_template et
  JOIN product p ON p.id = et.product_id
  JOIN endorsement_type t ON t.id = et.endorsement_type_id
  WHERE p.code = 'Rumbo' AND t.code = 'CambioFrecuencia' AND et.version = 1
)`;

module.exports = class SeedRumboCambioFrecuencia1764190100000 {
  name = 'SeedRumboCambioFrecuencia1764190100000';

  async up(queryRunner) {
    await queryRunner.query(`INSERT INTO product (code, name) VALUES ('Rumbo', 'Rumbo')`);
    await queryRunner.query(
      `INSERT INTO endorsement_type (code, name) VALUES ('CambioFrecuencia', 'Cambio de frecuencia de pago')`,
    );

    await queryRunner.query(`
      INSERT INTO endorsement_template (product_id, endorsement_type_id, version, event_description, active)
      SELECT p.id, t.id, 1, 'SolicitarEndoso', TRUE
      FROM product p, endorsement_type t
      WHERE p.code = 'Rumbo' AND t.code = 'CambioFrecuencia'`);

    await queryRunner.query(`
      INSERT INTO template_root_field
        (template_id, sort_order, target_path, kind, source_field, default_value, required)
      SELECT ${TEMPLATE}, v.sort_order, v.target_path, v.kind, v.source_field, v.default_value::jsonb, v.required
      FROM (VALUES
        (1,  'policyNumber',                                                        'FIELD',          'policyNumber', NULL,  TRUE),
        (2,  'idEnvio',                                                             'FIELD',          'idEnvio',      NULL,  TRUE),
        (3,  'financialPlansEntity.description',                                    'FIELD',          'frecuencia',   NULL,  TRUE),
        (4,  'currency.description',                                                'FIELD',          'moneda',       NULL,  TRUE),
        (5,  'productEntity.description',                                           'FIELD',          'producto',     NULL,  TRUE),
        (6,  'eventEntity',                                                         'EVENT_ENTITY',   NULL,           NULL,  FALSE),
        (7,  'eventAppliedEntities',                                                'APPLIED_EVENTS', NULL,           NULL,  FALSE),
        (8,  'riskUnitEntities[0].insuranceObjectEntities[0].insuranceObjectNumber', 'FIELD',          NULL,           '"1"', FALSE),
        (9,  'riskUnitEntities[0].insuranceObjectEntities[0].coverageEntities',      'FIELD',          NULL,           '[]',  FALSE),
        (10, 'riskUnitEntities[0].insuranceObjectEntities[0].participationEntities', 'FIELD',          NULL,           '[]',  FALSE),
        (11, 'riskUnitEntities[0].plansEntity.description',                         'FIELD',          'plan',         NULL,  TRUE),
        (12, 'riskUnitEntities[0].riskUnitNumber',                                  'FIELD',          NULL,           '"1"', FALSE),
        (13, 'participationEntities',                                               'FIELD',          NULL,           '[]',  FALSE)
      ) AS v(sort_order, target_path, kind, source_field, default_value, required)`);

    await queryRunner.query(`
      INSERT INTO template_dynamic_field
        (template_id, sort_order, label, source_field, default_value, required)
      SELECT ${TEMPLATE}, v.sort_order, v.label, v.source_field, v.default_value::jsonb, v.required
      FROM (VALUES
        (1,  'ProductosVida',          'producto',       NULL,              TRUE),
        (2,  'NombreUsuario',          'usuario',        NULL,              TRUE),
        (3,  'NumeroPolizaEndoso',     'policyNumber',   NULL,              TRUE),
        (4,  'TipoEndosoPol',          NULL,             '"Endoso Simple"', FALSE),
        (5,  'ResponsableAtencion',    NULL,             '"SAC"',           FALSE),
        (6,  'EndosoModifPrima',       NULL,             '"Si"',            FALSE),
        (7,  'InicioVigenciaEndoso',   NULL,             '"Default"',       FALSE),
        (8,  'TipoVigenciaEndoso',     NULL,             '""',              FALSE),
        (9,  'EndososSimplesSACRumbo', NULL,             '"TES008"',        FALSE),
        (10, 'FechaSolicitud',         'fechaSolicitud', NULL,              TRUE),
        (11, 'FechaCliente',           'fechaCliente',   NULL,              TRUE),
        (12, 'FechaEfectiva',          'fechaEfectiva',  NULL,              TRUE)
      ) AS v(sort_order, label, source_field, default_value, required)`);

    await queryRunner.query(`
      INSERT INTO template_event (template_id, order_event, description)
      SELECT ${TEMPLATE}, v.order_event, v.description
      FROM (VALUES (1, 'SolicitarEndoso'), (2, 'AprobarEndoso')) AS v(order_event, description)`);
  }

  async down(queryRunner) {
    await queryRunner.query(`DELETE FROM endorsement_template WHERE id = ${TEMPLATE}`);
    await queryRunner.query(`DELETE FROM endorsement_type WHERE code = 'CambioFrecuencia'`);
    await queryRunner.query(`DELETE FROM product WHERE code = 'Rumbo'`);
  }
};
