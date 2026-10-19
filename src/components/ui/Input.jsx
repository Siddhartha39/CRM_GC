import React from 'react';

/**
 * Neumorphic Soft UI Input
 * Appears deeply molded/carved into the background surface with tactile focus states.
 */
export function Input({
  label,
  error,
  required = false,
  className = '',
  containerClassName = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 flex items-center gap-1">
          {label}
          {required && <span className="text-accent">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`w-full bg-background text-foreground shadow-neu-pressed rounded-2xl px-4 py-2.5 text-sm font-body border-0 outline-none transition-all duration-300 placeholder:text-muted/60 focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${error ? 'ring-2 ring-danger' : ''} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-danger font-medium flex items-center gap-1 mt-0.5">
          ⚠ {error}
        </span>
      )}
    </div>
  );
}

export function Select({
  label,
  error,
  required = false,
  options = [],
  children,
  className = '',
  containerClassName = '',
  id,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 flex items-center gap-1">
          {label}
          {required && <span className="text-accent">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full bg-background text-foreground shadow-neu-pressed rounded-2xl px-4 py-2.5 text-sm font-body border-0 outline-none cursor-pointer transition-all duration-300 focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${error ? 'ring-2 ring-danger' : ''} ${className}`}
        {...props}
      >
        {options.length > 0
          ? options.map(opt => (
              <option key={opt.value ?? opt} value={opt.value ?? opt} className="bg-[#E0E5EC] text-foreground">
                {opt.label ?? opt}
              </option>
            ))
          : children}
      </select>
      {error && (
        <span className="text-xs text-danger font-medium flex items-center gap-1 mt-0.5">
          ⚠ {error}
        </span>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  required = false,
  className = '',
  containerClassName = '',
  rows = 3,
  id,
  ...props
}) {
  const areaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={areaId} className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 flex items-center gap-1">
          {label}
          {required && <span className="text-accent">*</span>}
        </label>
      )}
      <textarea
        id={areaId}
        rows={rows}
        className={`w-full bg-background text-foreground shadow-neu-pressed rounded-2xl px-4 py-2.5 text-sm font-body border-0 outline-none resize-y transition-all duration-300 placeholder:text-muted/60 focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${error ? 'ring-2 ring-danger' : ''} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-danger font-medium flex items-center gap-1 mt-0.5">
          ⚠ {error}
        </span>
      )}
    </div>
  );
}
