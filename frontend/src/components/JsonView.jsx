import { useState } from 'react';
import { pretty } from '../examples.js';

const TOKEN = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function highlight(text) {
  const nodes = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const [whole, string, colon, literal, number] = match;
    const kind = string ? (colon ? 'key' : 'string') : literal ? 'literal' : number ? 'number' : null;
    nodes.push(
      <span key={match.index} className={`json-${kind}`}>
        {string ?? whole}
      </span>,
    );
    if (colon) nodes.push(colon);
    last = match.index + whole.length;
  }
  nodes.push(text.slice(last));
  return nodes;
}

export function JsonView({ value, label = 'JSON' }) {
  const [copied, setCopied] = useState(false);
  const text = pretty(value);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="json-view">
      <div className="json-view__bar">
        <span>{label}</span>
        <button type="button" className="chip-button" onClick={copy}>
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="code code--output">{highlight(text)}</pre>
    </div>
  );
}
