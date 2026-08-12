import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

// Multiselección con búsqueda reutilizable.
// Convención de estado (Paso 3 revisión):
//   selected = []        -> sin filtro (todas las opciones)
//   selected = [id,...] -> opciones seleccionadas
// Nunca se almacena 'ALL'. El texto "Todas/Todos" es solo un placeholder visual.
//
// Props: options [{id, nombre, count?}], selected [id], onChange([id]), label, icon, iconColor, placeholder, disabled
export default function MultiSelect({
  options = [], selected = [], onChange, label, icon: Icon, iconColor = '#38bdf8',
  placeholder = 'Todas', disabled = false, emptyHint
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sin filtro cuando el array está vacío.
  const isAll = selected.length === 0;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('es-ES');
    if (!term) return options;
    return options.filter(o => [o.id, o.nombre, o.descripcion]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('es-ES')
      .includes(term));
  }, [options, searchTerm]);

  // Marcado: la primera pulsación cambia [] -> [id]; volver a pulsarla elimina solo ese id.
  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const removeOne = (id, e) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== id));
  };

  const selectAllVisible = () => {
    // Seleccionar visibles: sustituye la selección por las opciones visibles actuales
    onChange(filtered.map(o => o.id));
  };

  const clearAll = () => onChange([]);

  const selectedSet = new Set(selected);

  return (
    <div className={`filter-multiselect ${isOpen ? 'is-open' : ''}`} ref={dropdownRef}>
      <label className="filter-label">
        <Icon style={{ width: 13, height: 13, color: iconColor }} />
        {label}
        {!isAll && <span className="badge badge-blue" style={{ marginLeft: 4, padding: '1px 6px', fontSize: 10 }}>{selected.length}</span>}
      </label>

      <div
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        className={`filter-multiselect-trigger ${disabled ? 'disabled' : ''}`}
      >
        <div className="filter-multiselect-chips">
          {isAll ? (
            <span className="text-sm text-slate-300">{disabled ? (emptyHint || placeholder) : placeholder}</span>
          ) : (
            selected.slice(0, 3).map(id => {
              const opt = options.find(o => o.id === id);
              return (
                <span key={id} className="filter-multiselect-chip" style={{ borderColor: iconColor + '40', color: iconColor, background: iconColor + '15' }}>
                  <span className="truncate max-w-[90px]">{opt ? opt.nombre : id}</span>
                  <X style={{ width: 11, height: 11, cursor: 'pointer' }} onClick={(e) => removeOne(id, e)} />
                </span>
              );
            })
          )}
          {!isAll && selected.length > 3 && (
            <span className="text-xs text-slate-500">+{selected.length - 3} más</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isAll && <X style={{ width: 14, height: 14, color: '#64748b', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); clearAll(); }} />}
          <ChevronDown style={{ width: 14, height: 14, color: '#475569' }} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="filter-multiselect-dropdown">
          <div className="filter-multiselect-search">
            <Search style={{ width: 14, height: 14, color: '#475569', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="filter-multiselect-search-input"
              autoFocus
            />
          </div>
          <div className="filter-multiselect-actions">
            <button onClick={selectAllVisible} className="hover:text-sky-400 font-semibold">Seleccionar visibles</button>
            <button onClick={clearAll} className="hover:text-rose-400 font-semibold">Limpiar</button>
            <span>{filtered.length} opciones</span>
          </div>
          <div className="filter-multiselect-list">
            {filtered.map(o => {
              const isSel = selectedSet.has(o.id);
              return (
                <div
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  className={`filter-multiselect-option ${isSel ? 'selected' : ''}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <input type="checkbox" checked={isSel} readOnly className="rounded border-slate-600 bg-slate-900" />
                    <span className="truncate">{o.nombre || o.id}</span>
                    {o.descripcion && o.descripcion !== o.nombre && (
                      <span className="text-[10px] text-slate-500 truncate">— {o.descripcion}</span>
                    )}
                  </div>
                  {o.count !== undefined && <span className="text-[10px] text-slate-500 font-mono">({o.count})</span>}
                </div>
              );
            })}
            {filtered.length === 0 && <div className="p-3 text-center text-xs text-slate-500">Sin resultados.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
