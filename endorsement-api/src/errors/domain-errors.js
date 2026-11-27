'use strict';

class DomainError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

class InvalidPayloadError extends DomainError {
  constructor(details) {
    super('El payload enviado no es válido', 'INVALID_PAYLOAD', details);
  }
}

class TemplateNotFoundError extends DomainError {
  constructor(productCode, endorsementTypeCode) {
    super(
      `No existe una plantilla activa para el producto "${productCode}" y tipo de endoso "${endorsementTypeCode}"`,
      'TEMPLATE_NOT_FOUND',
      { producto: productCode, tipoEndoso: endorsementTypeCode },
    );
  }
}

class MissingTemplateFieldsError extends DomainError {
  constructor(missingFields, template) {
    super(
      `Faltan ${missingFields.length} campo(s) obligatorio(s) de la plantilla ${template.productCode}/${template.endorsementTypeCode} v${template.version}`,
      'MISSING_TEMPLATE_FIELDS',
      { templateVersion: template.version, missingFields },
    );
  }
}

class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Credenciales de cliente inválidas', 'INVALID_CREDENTIALS');
  }
}

module.exports = {
  DomainError,
  InvalidPayloadError,
  TemplateNotFoundError,
  MissingTemplateFieldsError,
  InvalidCredentialsError,
};
