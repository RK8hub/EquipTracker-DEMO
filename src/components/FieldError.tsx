export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p data-field-error className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}
