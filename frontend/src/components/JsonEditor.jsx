import { useId } from 'react';

export function parseJson(text) {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (error) {
    return { value: null, error: error.message };
  }
}

export function JsonEditor({ label, value, onChange, rows = 16, onReset }) {
  const id = useId();
  const { error } = parseJson(value);
  return (
    <div className="field">
      <div className="field__header">
        <label htmlFor={id}>{label}</label>
        <span className={`pill ${error ? 'pill--error' : 'pill--ok'}`}>{error ? 'JSON inválido' : 'JSON válido'}</span>
      </div>
      <textarea
        id={id}
        className={`code code--editor ${error ? 'code--invalid' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        aria-invalid={Boolean(error)}
      />
      <div className="field__footer">
        {error ? <span className="field__error">{error}</span> : <span />}
        {onReset ? (
          <button type="button" className="link" onClick={onReset}>
            ↺ Restaurar ejemplo del enunciado
          </button>
        ) : null}
      </div>
    </div>
  );
}
