import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SlabRow {
  id: number;
  tag: string;
  lyFt: string;
  lxFt: string;
  diaY: string;
  spY: string;
  diaX: string;
  spX: string;
}

export default function SlabBBSCalculator() {
  const [rows, setRows] = useState<SlabRow[]>([
    { id: 1, tag: 'S1', lyFt: '17.75', lxFt: '17.75', diaY: '10', spY: '6', diaX: '10', spX: '6' }
  ]);

  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const lyFt = parseFloat(r.lyFt) || 0;
      const lxFt = parseFloat(r.lxFt) || 0;
      const spY = parseFloat(r.spY) || 0;
      const spX = parseFloat(r.spX) || 0;
      const dY = parseInt(r.diaY);
      const dX = parseInt(r.diaX);

      // Conversion to Meters
      const lyM = lyFt / 3.281;
      const lxM = lxFt / 3.281;

      // Nos Calculation matching your Excel: =C6/(E6/12/3.281)+1
      const nosY = spY > 0 ? Math.floor(lyM / (spY / 12 / 3.281)) + 1 : 0;
      const nosX = spX > 0 ? Math.floor(lxM / (spX / 12 / 3.281)) + 1 : 0;

      // Exact Weight Calculation: (Length * Nos * D^2 / 162)
      const weightY = (lyM * nosY * (dY * dY)) / 162;
      const weightX = (lxM * nosX * (dX * dX)) / 162;
      const totalKg = weightY + weightX;

      return { ...r, nosY, nosX, totalKg };
    });

    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0 };
    results.forEach(res => {
      const dy = parseInt(res.diaY);
      const dx = parseInt(res.diaX);
      const lyM = (parseFloat(res.lyFt) || 0) / 3.281;
      const lxM = (parseFloat(res.lxFt) || 0) / 3.281;
      
      summary[dy] += (lyM * res.nosY * (dy * dy)) / 162;
      summary[dx] += (lxM * res.nosX * (dx * dx)) / 162;
    });

    return { results, summary };
  }, [rows]);

  const shareToWhatsApp = () => {
    let message = `*UNiQ DESIGNS - SLAB BBS REPORT*%0A%0A`;
    computedData.results.forEach(r => {
      message += `*${r.tag}*: ${r.lyFt}'x${r.lxFt}' | Ly:${r.nosY}nos Lx:${r.nosX}nos | *${r.totalKg.toFixed(2)} KG*%0A`;
    });
    message += `%0A*TOTAL STEEL:* ${Object.values(computedData.summary).reduce((a, b) => a + b, 0).toFixed(2)} KG`;
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const updateRow = (id: number, field: keyof SlabRow, val: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', fontFamily: '"Segoe UI", Roboto, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <header style={{ backgroundColor: '#92d050', padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '20px', color: '#000', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        SLAB BBS CALCULATOR
      </header>

      <div style={{ padding: '12px' }}>
        {rows.map((row, idx) => (
          <div key={row.id} style={{ background: '#00b0f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', border: '2px solid #0070c0' }}>
            <div style={{ background: '#0070c0', color: '#fff', padding: '6px 12px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>SLAB DATA - {row.tag}</span>
              <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={{ background: '#ff0000', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '0 8px' }}>X</button>
            </div>
            
            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#fff', padding: '6px', borderRadius: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Ly (Ft)</label>
                <input type="text" value={row.lyFt} onChange={e => updateRow(row.id, 'lyFt', e.target.value)} style={{ width: '100%', border: 'none', fontSize: '15px', fontWeight: '900' }} />
              </div>
              <div style={{ background: '#fff', padding: '6px', borderRadius: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Lx (Ft)</label>
                <input type="text" value={row.lxFt} onChange={e => updateRow(row.id, 'lxFt', e.target.value)} style={{ width: '100%', border: 'none', fontSize: '15px', fontWeight: '900' }} />
              </div>
              <div style={{ background: '#e1f5fe', padding: '6px', borderRadius: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Ly Dia/Sp</label>
                <div style={{ display: 'flex' }}>
                  <select value={row.diaY} onChange={e => updateRow(row.id, 'diaY', e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 'bold' }}>
                    <option value="8">8mm</option><option value="10">10mm</option><option value="12">12mm</option>
                  </select>
                  <input value={row.spY} onChange={e => updateRow(row.id, 'spY', e.target.value)} style={{ width: '40px', border: 'none', marginLeft: '5px', fontWeight: 'bold' }} />
                </div>
              </div>
              <div style={{ background: '#e1f5fe', padding: '6px', borderRadius: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Lx Dia/Sp</label>
                <div style={{ display: 'flex' }}>
                  <select value={row.diaX} onChange={e => updateRow(row.id, 'diaX', e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 'bold' }}>
                    <option value="8">8mm</option><option value="10">10mm</option><option value="12">12mm</option>
                  </select>
                  <input value={row.spX} onChange={e => updateRow(row.id, 'spX', e.target.value)} style={{ width: '40px', border: 'none', marginLeft: '5px', fontWeight: 'bold' }} />
                </div>
              </div>
            </div>

            <div style={{ background: '#ffff00', padding: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', borderTop: '1px solid #0070c0' }}>
              <span>Bars: Y:{computedData.results[idx].nosY} / X:{computedData.results[idx].nosX}</span>
              <span>{computedData.results[idx].totalKg.toFixed(2)} KG</span>
            </div>
          </div>
        ))}

        <div style={{ background: '#fff', border: '2px solid #0070c0', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', fontSize: '16px', borderBottom: '1px solid #eee' }}>STEEL SUMMARY</h3>
          {Object.entries(computedData.summary).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
              <span style={{ fontWeight: 'bold' }}>{dia}mm Steel:</span>
              <span style={{ fontWeight: 'bold' }}>{kg.toFixed(2)} KG</span>
            </div>
          ))}
        </div>

        <button onClick={() => setRows([...rows, { id: Date.now(), tag: `S${rows.length + 1}`, lyFt: '10', lxFt: '10', diaY: '8', spY: '6', diaX: '8', spX: '6' }])} style={{ width: '100%', padding: '12px', background: '#0070c0', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginBottom: '10px' }}>+ ADD SLAB TYPE</button>
        <button onClick={shareToWhatsApp} style={{ width: '100%', padding: '12px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginBottom: '10px' }}>SHARE TO WHATSAPP</button>
      </div>
    </div>
  );
}
