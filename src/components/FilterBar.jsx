import React, { useState, useMemo } from 'react';
import {
  Search, FolderTree, Tag, Box, RotateCcw, X, ChevronRight,
  Building2, MapPin, SlidersHorizontal
} from 'lucide-react';
import MultiSelect from './MultiSelect';

// Orden revisado: Grupo -> Subgrupo -> Marca -> Empresa -> Delegacion.
// Convención: [] = sin filtro. Subgrupo deshabilitado mientras no haya Grupo.
export default function FilterBar({ filters, setFilters, catalogos, onReset }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const grupos = catalogos?.grupos || [];
  const empresasCatalogo = catalogos?.empresas || [];
  const tieneGrupos = (filters.grupos || []).length > 0;

  // Subgrupos del/los grupo(s) seleccionado(s). Clave compuesta grupo|subgrupo.
  const subgrupos = useMemo(() => {
    const gs = filters.grupos || [];
    if (gs.length === 0) return [];
    const result = [];
    const seen = new Set();
    for (const gId of gs) {
      const arr = catalogos?.subgruposPorGrupo?.[gId] || [];
      for (const s of arr) {
        if (!seen.has(s.id)) { seen.add(s.id); result.push(s); }
      }
    }
    return result;
  }, [filters.grupos, catalogos]);

  // Marcas: si hay grupos, limitadas a esos grupos; si no, todas.
  // Marca refina subgrupos (no es requisito para habilitarlos).
  const marcas = useMemo(() => {
    const gs = filters.grupos || [];
    if (gs.length === 0) {
      const all = [];
      const seen = new Set();
      for (const gId of Object.keys(catalogos?.marcasPorGrupo || {})) {
        for (const m of (catalogos.marcasPorGrupo[gId] || [])) {
          if (!seen.has(m.id)) { seen.add(m.id); all.push(m); }
        }
      }
      return all;
    }
    const result = [];
    const seen = new Set();
    for (const gId of gs) {
      for (const m of (catalogos?.marcasPorGrupo?.[gId] || [])) {
        if (!seen.has(m.id)) { seen.add(m.id); result.push(m); }
      }
    }
    return result;
  }, [filters.grupos, catalogos]);

  // Delegaciones: si hay empresas, limitadas a esas; si no, todas.
  const delegaciones = useMemo(() => {
    const es = filters.empresas || [];
    if (es.length === 0) {
      const all = [];
      for (const eId of Object.keys(catalogos?.delegacionesPorEmpresa || {})) {
        all.push(...(catalogos.delegacionesPorEmpresa[eId] || []));
      }
      return all;
    }
    const result = [];
    for (const eId of es) {
      result.push(...(catalogos?.delegacionesPorEmpresa?.[eId] || []));
    }
    return result;
  }, [filters.empresas, catalogos]);

  const activeCount = [
    (filters.grupos || []).length > 0,
    (filters.subgrupos || []).length > 0,
    (filters.marcas || []).length > 0,
    (filters.empresas || []).length > 0,
    (filters.delegaciones || []).length > 0,
    filters.searchTerm && filters.searchTerm.trim() !== '',
    filters.stockFilter && filters.stockFilter !== 'ALL',
    filters.costoFilter && filters.costoFilter !== 'ALL',
  ].filter(Boolean).length;

  // Al cambiar grupos: limpiar subgrupos y marcas (ya no son compatibles).
  const updateGrupos = (newGrupos) => {
    setFilters(p => ({ ...p, grupos: newGrupos, subgrupos: [], marcas: [] }));
  };
  // Al cambiar marcas: limpiar subgrupos no compatibles con la marca+grupo.
  const updateMarcas = (newMarcas) => {
    setFilters(p => {
      const gs = p.grupos || [];
      const ms = newMarcas;
      let subgs = p.subgrupos || [];
      if (gs.length > 0 && ms.length > 0) {
        // Filtrar subgrupos compuestos: conservar solo los que existen en
        // algun (grupo+marca) permitido.
        const permitidos = new Set();
        for (const g of gs) for (const m of ms) {
          const arr = catalogos?.subgruposPorGrupoMarca?.[`${g}|${m}`] || [];
          arr.forEach(s => permitidos.add(s));
        }
        // subgrupos compuestos guardados como "grupo|subgrupo_id"
        subgs = subgs.filter(comp => {
          const sep = comp.indexOf('|');
          const sId = sep > 0 ? comp.slice(sep + 1) : comp;
          return permitidos.has(sId);
        });
      }
      return { ...p, marcas: ms, subgrupos: subgs };
    });
  };

  return (
    <div className="filter-panel mb-6">
      <div className="filter-row">
        <div className="filter-header">
          <SlidersHorizontal style={{ width: 15, height: 15, color: '#38bdf8' }} />
          <span className="filter-title">Filtros</span>
          {activeCount > 0 && <span className="badge badge-blue">{activeCount} activo{activeCount > 1 ? 's' : ''}</span>}
        </div>

        <div className="filter-search">
          <Search className="filter-search-icon" style={{ color: searchFocused ? '#38bdf8' : '#475569' }} />
          <input
            type="text"
            placeholder="Código, referencia, descripción, marca..."
            value={filters.searchTerm || ''}
            onChange={e => setFilters(p => ({ ...p, searchTerm: e.target.value }))}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`filter-search-input ${searchFocused ? 'focused' : ''}`}
          />
          {filters.searchTerm && (
            <button onClick={() => setFilters(p => ({ ...p, searchTerm: '' }))} className="filter-clear-btn">
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>

        <button onClick={onReset} className="filter-reset-btn">
          <RotateCcw style={{ width: 12, height: 12 }} />
          Limpiar todo
        </button>
        <button onClick={() => setPanelOpen(v => !v)} className="filter-toggle-btn">
          <ChevronRight style={{ width: 14, height: 14, transition: 'transform 0.2s', transform: panelOpen ? 'rotate(90deg)' : 'none' }} />
          {panelOpen ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {/* Nivel 2: orden Grupo → Subgrupo → Marca → Empresa → Delegación */}
      {panelOpen && (
        <div className="filter-row secondary">
          <div style={{ minWidth: 160 }}>
            <MultiSelect
              options={grupos} selected={filters.grupos || []} onChange={updateGrupos}
              label="Grupo de marca" icon={FolderTree} iconColor="#fbbf24" placeholder="Todos los grupos"
            />
          </div>
          <ChevronRight className="filter-arrow" />
          <div style={{ minWidth: 160 }}>
            <MultiSelect
              options={subgrupos} selected={filters.subgrupos || []}
              onChange={(v) => setFilters(p => ({ ...p, subgrupos: v }))}
              label="Subgrupo" icon={FolderTree} iconColor="#34d399"
              placeholder={tieneGrupos ? 'Todos los subgrupos' : 'Seleccione un grupo'}
              disabled={!tieneGrupos} emptyHint="Seleccione primero un grupo"
            />
          </div>
          <ChevronRight className="filter-arrow" />
          <div style={{ minWidth: 160 }}>
            <MultiSelect
              options={marcas} selected={filters.marcas || []} onChange={updateMarcas}
              label="Marca" icon={Tag} iconColor="#c084fc" placeholder="Todas las marcas"
            />
          </div>
          <div style={{ minWidth: 140 }}>
            <MultiSelect
              options={empresasCatalogo} selected={filters.empresas || []}
              onChange={(v) => setFilters(p => ({ ...p, empresas: v, delegaciones: [] }))}
              label="Empresa" icon={Building2} iconColor="#818cf8" placeholder="Todas"
            />
          </div>
          <div style={{ minWidth: 140 }}>
            <MultiSelect
              options={delegaciones} selected={filters.delegaciones || []}
              onChange={(v) => setFilters(p => ({ ...p, delegaciones: v }))}
              label="Delegación" icon={MapPin} iconColor="#34d399" placeholder="Todas"
            />
          </div>
          <div style={{ minWidth: 120 }}>
            <MultiSelect
              options={[
                { id: 'CON_STOCK', nombre: 'Con stock' },
                { id: 'BAJO_STOCK', nombre: 'Stock bajo (<15)' },
                { id: 'SIN_STOCK', nombre: 'Sin existencias' },
              ]}
              selected={filters.stockFilter && filters.stockFilter !== 'ALL' ? [filters.stockFilter] : []}
              onChange={(v) => setFilters(p => ({ ...p, stockFilter: v.length > 0 ? v[v.length - 1] : 'ALL' }))}
              label="Estado stock" icon={Box} iconColor="#f43f5e" placeholder="Todos"
            />
          </div>
          <div style={{ minWidth: 120 }}>
            <MultiSelect
              options={[
                { id: 'SIN_COSTE', nombre: 'Sin coste informado' },
                { id: '0-1', nombre: '0 – 1 €' },
                { id: '1-5', nombre: '1 – 5 €' },
                { id: '5-20', nombre: '5 – 20 €' },
                { id: '20-50', nombre: '20 – 50 €' },
                { id: '50-100', nombre: '50 – 100 €' },
                { id: '100+', nombre: 'Más de 100 €' },
              ]}
              selected={filters.costoFilter && filters.costoFilter !== 'ALL' ? [filters.costoFilter] : []}
              onChange={(v) => setFilters(p => ({ ...p, costoFilter: v.length > 0 ? v[v.length - 1] : 'ALL' }))}
              label="Rango coste" icon={Tag} iconColor="#22d3ee" placeholder="Cualquiera"
            />
          </div>
        </div>
      )}
    </div>
  );
}