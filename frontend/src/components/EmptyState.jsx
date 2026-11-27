export function EmptyState({ icon, title, children }) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{title}</strong>
      <p className="muted">{children}</p>
    </div>
  );
}
