'use strict';

module.exports = class CreateEndorsementTemplates1764190000000 {
  name = 'CreateEndorsementTemplates1764190000000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE product (
        id SERIAL PRIMARY KEY,
        code VARCHAR(60) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE endorsement_type (
        id SERIAL PRIMARY KEY,
        code VARCHAR(60) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE endorsement_template (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL REFERENCES product(id),
        endorsement_type_id INT NOT NULL REFERENCES endorsement_type(id),
        version INT NOT NULL CHECK (version > 0),
        event_description VARCHAR(120) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT uq_template_version UNIQUE (product_id, endorsement_type_id, version)
      )`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_template_single_active
        ON endorsement_template (product_id, endorsement_type_id)
        WHERE active`);

    await queryRunner.query(`
      CREATE TABLE template_root_field (
        id SERIAL PRIMARY KEY,
        template_id INT NOT NULL REFERENCES endorsement_template(id) ON DELETE CASCADE,
        sort_order INT NOT NULL,
        target_path VARCHAR(255) NOT NULL,
        kind VARCHAR(20) NOT NULL DEFAULT 'FIELD'
          CHECK (kind IN ('FIELD', 'EVENT_ENTITY', 'APPLIED_EVENTS')),
        source_field VARCHAR(80),
        default_value JSONB,
        required BOOLEAN NOT NULL DEFAULT FALSE,
        CONSTRAINT uq_root_field_order UNIQUE (template_id, sort_order),
        CONSTRAINT uq_root_field_path UNIQUE (template_id, target_path),
        CONSTRAINT ck_root_field_value_source
          CHECK (kind <> 'FIELD' OR source_field IS NOT NULL OR default_value IS NOT NULL)
      )`);

    await queryRunner.query(`
      CREATE TABLE template_dynamic_field (
        id SERIAL PRIMARY KEY,
        template_id INT NOT NULL REFERENCES endorsement_template(id) ON DELETE CASCADE,
        sort_order INT NOT NULL,
        label VARCHAR(120) NOT NULL,
        source_field VARCHAR(80),
        default_value JSONB,
        required BOOLEAN NOT NULL DEFAULT FALSE,
        CONSTRAINT uq_dynamic_field_order UNIQUE (template_id, sort_order),
        CONSTRAINT uq_dynamic_field_label UNIQUE (template_id, label),
        CONSTRAINT ck_dynamic_field_value_source
          CHECK (source_field IS NOT NULL OR default_value IS NOT NULL)
      )`);

    await queryRunner.query(`
      CREATE TABLE template_event (
        id SERIAL PRIMARY KEY,
        template_id INT NOT NULL REFERENCES endorsement_template(id) ON DELETE CASCADE,
        order_event INT NOT NULL,
        description VARCHAR(120) NOT NULL,
        CONSTRAINT uq_template_event_order UNIQUE (template_id, order_event)
      )`);
  }

  async down(queryRunner) {
    await queryRunner.query('DROP TABLE template_event');
    await queryRunner.query('DROP TABLE template_dynamic_field');
    await queryRunner.query('DROP TABLE template_root_field');
    await queryRunner.query('DROP TABLE endorsement_template');
    await queryRunner.query('DROP TABLE endorsement_type');
    await queryRunner.query('DROP TABLE product');
  }
};
