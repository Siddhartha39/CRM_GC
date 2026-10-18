import React from 'react';

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
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="font-heading font-bold text-sm text-foreground flex items-center gap-1">
          {label}
          {required && <span className="text-accent">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`input-hand w-full ${error ? 'border-accent focus:border-accent' : ''} ${className}`}
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
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="font-heading font-bold text-sm text-foreground flex items-center gap-1">
          {label}
          {required && <span className="text-accent">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`input-hand bg-white w-full cursor-pointer ${error ? 'border-accent' : ''} ${className}`}
        {...props}
      >
        {options.length > 0
          ? options.map(opt => (
              <option key={opt.value ?? opt} value={opt.value ?? opt}>
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
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={areaId} className="font-heading font-bold text-sm text-foreground flex items-center gap-1">
          {label}
          {required && <span className="text-accent">*</span>}
        </label>
      )}
      <textarea
        id={areaId}
        rows={rows}
        className={`input-hand w-full resize-y ${error ? 'border-accent focus:border-accent' : ''} ${className}`}
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
