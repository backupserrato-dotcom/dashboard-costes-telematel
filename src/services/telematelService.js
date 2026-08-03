// Servicio de datos de ejemplo para las pestañas heredadas del dashboard.
// No contiene credenciales ni realiza llamadas de red al ERP.

export const EMPRESAS_DELEGACIONES = [
  {
    empresaId: '03',
    empresaNombre: '03 San Pedro',
    delegaciones: [
      { id: '00', nombre: '00 Electricidad', tipo: 'Electricidad' },
      { id: '10', nombre: '10 Fontanería', tipo: 'Fontanería' }
    ]
  },
  {
    empresaId: '04',
    empresaNombre: '04 Estepona',
    delegaciones: [
      { id: '00', nombre: '00 Electricidad', tipo: 'Electricidad' },
      { id: '10', nombre: '10 Fontanería', tipo: 'Fontanería' }
    ]
  },
  {
    empresaId: '05',
    empresaNombre: '05 Marbella',
    delegaciones: [
      { id: '00', nombre: '00 Marbella', tipo: 'Marbella' }
    ]
  }
];

// Dataset local de ejemplo para las pestañas heredadas
const GENERATED_ARTICLES = [
  // Schneider Electric (Electricidad)
  {
    cod_art: 'ART-SCH-001',
    ref_art: 'A9F84216',
    nom_art: 'Interruptor Automático iC60N 2P 16A C',
    cod_mar: 'MAR-01',
    nom_mar: 'Schneider Electric',
    cod_grc: 'GRP-ELEC',
    nom_grc: 'Material Eléctrico General',
    cod_gru: 'SUB-PROT',
    nom_gru: 'Protección y Magnetotérmicos',
    cos_med: 18.45,
    cos_ul: 19.10,
    stocks: {
      '03-00': 45, // San Pedro Elec
      '03-10': 0,  // San Pedro Font
      '04-00': 32, // Estepona Elec
      '04-10': 0,  // Estepona Font
      '05-00': 28  // Marbella
    }
  },
  {
    cod_art: 'ART-SCH-002',
    ref_art: 'A9R11225',
    nom_art: 'Diferencial iID 2P 25A 30mA Clase AC',
    cod_mar: 'MAR-01',
    nom_mar: 'Schneider Electric',
    cod_grc: 'GRP-ELEC',
    nom_grc: 'Material Eléctrico General',
    cod_gru: 'SUB-PROT',
    nom_gru: 'Protección y Magnetotérmicos',
    cos_med: 34.20,
    cos_ul: 35.00,
    stocks: {
      '03-00': 22,
      '03-10': 0,
      '04-00': 18,
      '04-10': 0,
      '05-00': 15
    }
  },

  // Simon (Electricidad y Iluminación)
  {
    cod_art: 'ART-SIM-101',
    ref_art: '10000101-039',
    nom_art: 'Base de enchufe schuko Simon 100 Blanco',
    cod_mar: 'MAR-02',
    nom_mar: 'Simon',
    cod_grc: 'GRP-ELEC',
    nom_grc: 'Material Eléctrico General',
    cod_gru: 'SUB-MEC',
    nom_gru: 'Mecanismos y Series',
    cos_med: 6.80,
    cos_ul: 7.05,
    stocks: {
      '03-00': 120,
      '03-10': 5,
      '04-00': 95,
      '04-10': 0,
      '05-00': 80
    }
  },
  {
    cod_art: 'ART-SIM-102',
    ref_art: '10000201-039',
    nom_art: 'Interruptor Regulador Simon 100 iO',
    cod_mar: 'MAR-02',
    nom_mar: 'Simon',
    cod_grc: 'GRP-ELEC',
    nom_grc: 'Material Eléctrico General',
    cod_gru: 'SUB-DOMO',
    nom_gru: 'Domótica y Control',
    cos_med: 42.50,
    cos_ul: 44.00,
    stocks: {
      '03-00': 14,
      '03-10': 0,
      '04-00': 10,
      '04-10': 0,
      '05-00': 12
    }
  },

  // Prysmian / General Cable (Electricidad)
  {
    cod_art: 'ART-PRY-501',
    ref_art: 'PRY-1000-C750',
    nom_art: 'Cable Afumex Fripuls Z1C4Z1-K 3G2.5 (Rollo 100m)',
    cod_mar: 'MAR-03',
    nom_mar: 'Prysmian Group',
    cod_grc: 'GRP-ELEC',
    nom_grc: 'Material Eléctrico General',
    cod_gru: 'SUB-CAB',
    nom_gru: 'Conductores y Cables',
    cos_med: 89.60,
    cos_ul: 92.30,
    stocks: {
      '03-00': 35,
      '03-10': 2,
      '04-00': 28,
      '04-10': 0,
      '05-00': 24
    }
  },

  // Roca (Fontanería)
  {
    cod_art: 'ART-ROC-001',
    ref_art: 'A8012AC004',
    nom_art: 'Inodoro Tanque Bajo Victoria Blanco',
    cod_mar: 'MAR-04',
    nom_mar: 'Roca Sanitarios',
    cod_grc: 'GRP-FONT',
    nom_grc: 'Fontanería y Saneamiento',
    cod_gru: 'SUB-SAN',
    nom_gru: 'Loza y Sanitarios',
    cos_med: 94.15,
    cos_ul: 96.50,
    stocks: {
      '03-00': 0,
      '03-10': 38,
      '04-00': 0,
      '04-10': 29,
      '05-00': 19
    }
  },
  {
    cod_art: 'ART-ROC-002',
    ref_art: 'A5A3025C00',
    nom_art: 'Monomando Lavabo Lanta Cromado',
    cod_mar: 'MAR-04',
    nom_mar: 'Roca Sanitarios',
    cod_grc: 'GRP-FONT',
    nom_grc: 'Fontanería y Saneamiento',
    cod_gru: 'SUB-GRIF',
    nom_gru: 'Grifería y Accesorios',
    cos_med: 58.75,
    cos_ul: 60.20,
    stocks: {
      '03-00': 0,
      '03-10': 42,
      '04-00': 0,
      '04-10': 31,
      '05-00': 22
    }
  },

  // Geberit (Fontanería)
  {
    cod_art: 'ART-GEB-301',
    ref_art: '111.300.00.5',
    nom_art: 'Cisterna Empotrada Geberit Duofix Sigma 12cm',
    cod_mar: 'MAR-05',
    nom_mar: 'Geberit',
    cod_grc: 'GRP-FONT',
    nom_grc: 'Fontanería y Saneamiento',
    cod_gru: 'SUB-EMP',
    nom_gru: 'Sistemas Empotrados',
    cos_med: 185.00,
    cos_ul: 189.50,
    stocks: {
      '03-00': 0,
      '03-10': 18,
      '04-00': 0,
      '04-10': 14,
      '05-00': 9
    }
  },

  // Jimten (Fontanería)
  {
    cod_art: 'ART-JIM-401',
    ref_art: '022014',
    nom_art: 'Sifón Botella Extensible T-4-A 1 1/2',
    cod_mar: 'MAR-06',
    nom_mar: 'Jimten',
    cod_grc: 'GRP-FONT',
    nom_grc: 'Fontanería y Saneamiento',
    cod_gru: 'SUB-EVAC',
    nom_gru: 'Evacuación y Sifones',
    cos_med: 4.35,
    cos_ul: 4.50,
    stocks: {
      '03-00': 10,
      '03-10': 140,
      '04-00': 8,
      '04-10': 115,
      '05-00': 90
    }
  },

  // Junkers / Bosch (Climatización y Agua Caliente)
  {
    cod_art: 'ART-BOS-601',
    ref_art: '7736504153',
    nom_art: 'Calentador Estanco HydroCompact 6000i W 12-2 E',
    cod_mar: 'MAR-07',
    nom_mar: 'Bosch / Junkers',
    cod_grc: 'GRP-CLIMA',
    nom_grc: 'Climatización y ACS',
    cod_gru: 'SUB-CAL',
    nom_gru: 'Calentadores y Termos',
    cos_med: 312.00,
    cos_ul: 325.00,
    stocks: {
      '03-00': 2,
      '03-10': 12,
      '04-00': 1,
      '04-10': 9,
      '05-00': 7
    }
  },

  // Philips (Iluminación)
  {
    cod_art: 'ART-PHI-701',
    ref_art: '929001381202',
    nom_art: 'Lámpara LED CorePro LEDtube 1200mm 14.5W 840',
    cod_mar: 'MAR-08',
    nom_mar: 'Philips Lighting',
    cod_grc: 'GRP-ELEC',
    nom_grc: 'Material Eléctrico General',
    cod_gru: 'SUB-ILUM',
    nom_gru: 'Iluminación y LED',
    cos_med: 5.15,
    cos_ul: 5.30,
    stocks: {
      '03-00': 85,
      '03-10': 12,
      '04-00': 64,
      '04-10': 8,
      '05-00': 50
    }
  },

  // Legrand (Electricidad)
  {
    cod_art: 'ART-LEG-801',
    ref_art: '412535',
    nom_art: 'Contactor CX3 2P 25A 240V 2NO',
    cod_mar: 'MAR-09',
    nom_mar: 'Legrand',
    cod_grc: 'GRP-ELEC',
    nom_grc: 'Material Eléctrico General',
    cod_gru: 'SUB-PROT',
    nom_gru: 'Protección y Magnetotérmicos',
    cos_med: 22.80,
    cos_ul: 23.50,
    stocks: {
      '03-00': 19,
      '03-10': 0,
      '04-00': 16,
      '04-10': 0,
      '05-00': 11
    }
  }
];

// Catálogo completo para poblar selectores sin quedar limitado por otros filtros.
export function getAllLocalArticles() {
  return [...GENERATED_ARTICLES];
}

// Extract processed articles with calculated costs & stock per company/delegation
export function getProcessedArticles(filters = {}) {
  const { empresaId, delegacionId, marcaId, grupoId, subgrupoId, searchTerm, stockFilter } = filters;

  return GENERATED_ARTICLES.filter(art => {
    // Empresa & Delegación filter
    if (empresaId && empresaId !== 'ALL') {
      if (delegacionId && delegacionId !== 'ALL') {
        const key = `${empresaId}-${delegacionId}`;
        if (!art.stocks[key] || art.stocks[key] <= 0) {
          // If filtering specifically by a delegation, we check if there's stock or activity
        }
      } else {
        // Filter by any delegation under this empresa
        const hasEmpresaStock = Object.keys(art.stocks).some(k => k.startsWith(`${empresaId}-`));
        if (!hasEmpresaStock) return false;
      }
    }

    // Marca filter
    if (marcaId && marcaId !== 'ALL' && art.cod_mar !== marcaId) {
      return false;
    }

    // Grupo filter
    if (grupoId && grupoId !== 'ALL' && art.cod_grc !== grupoId) {
      return false;
    }

    // Subgrupo filter
    if (subgrupoId && subgrupoId !== 'ALL' && art.cod_gru !== subgrupoId) {
      return false;
    }

    // Search term (Code, Ref Fabricante, Name)
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchCode = art.cod_art.toLowerCase().includes(term);
      const matchRef = art.ref_art.toLowerCase().includes(term);
      const matchName = art.nom_art.toLowerCase().includes(term);
      const matchBrand = art.nom_mar.toLowerCase().includes(term);
      if (!matchCode && !matchRef && !matchName && !matchBrand) return false;
    }

    // Stock filter
    if (stockFilter && stockFilter !== 'ALL') {
      const totalStock = Object.values(art.stocks).reduce((a, b) => a + b, 0);
      if (stockFilter === 'CON_STOCK' && totalStock <= 0) return false;
      if (stockFilter === 'SIN_STOCK' && totalStock > 0) return false;
      if (stockFilter === 'BAJO_STOCK' && (totalStock <= 0 || totalStock > 15)) return false;
    }

    return true;
  });
}

// Calculate summary KPI metrics from filtered dataset
export function calculateKpis(articles, selectedEmpresa = 'ALL', selectedDelegacion = 'ALL') {
  let totalArticles = articles.length;
  let totalStockUnits = 0;
  let totalValuation = 0;
  let totalWeightedCostSum = 0;

  articles.forEach(art => {
    let stockForScope = 0;
    if (selectedEmpresa !== 'ALL' && selectedDelegacion !== 'ALL') {
      const key = `${selectedEmpresa}-${selectedDelegacion}`;
      stockForScope = art.stocks[key] || 0;
    } else if (selectedEmpresa !== 'ALL') {
      Object.keys(art.stocks).forEach(k => {
        if (k.startsWith(`${selectedEmpresa}-`)) {
          stockForScope += art.stocks[k];
        }
      });
    } else {
      stockForScope = Object.values(art.stocks).reduce((a, b) => a + b, 0);
    }

    totalStockUnits += stockForScope;
    const valuation = stockForScope * art.cos_med;
    totalValuation += valuation;
    totalWeightedCostSum += art.cos_med;
  });

  const averageCost = totalArticles > 0 ? totalWeightedCostSum / totalArticles : 0;
  const weightedAverageCost = totalStockUnits > 0 ? totalValuation / totalStockUnits : averageCost;

  return {
    totalArticles,
    totalStockUnits,
    totalValuation,
    averageCost,
    weightedAverageCost
  };
}
