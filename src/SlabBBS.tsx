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

const ROD_OPTIONS = [8, 10, 12, 16, 20, 25];

export default function SlabBBSCalculator() {
  const [rows, setRows] = useState<SlabRow[]>([
    { id: 1, tag: 'S1', lyFt: '11.75', lxFt: '10.76', diaY: '8', spY: '6', diaX: '10', spX: '6' }
  ]);

  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const lyFt = parseFloat(r.lyFt) || 0;
      const lxFt = parseFloat(r.lxFt) || 0;
      const spY = parseFloat(r.spY) || 0;
      const spX = parseFloat(r.spX) || 0;
      const dY = parseInt(r.diaY);
      const dX = parseInt(r.diaX);

      const lyM = lyFt / 3.281;
      const lxM = lxFt / 3.281;

      // Nos Calculation matching Excel logic: (Length / Spacing) + 1
      const nosY = spY > 0 ? Math.floor(lyM / (spY / 12 / 3.281)) + 1 : 0;
      const nosX = spX > 0 ? Math.floor(lxM / (spX / 12 / 3.281)) + 1 : 0;

      const weightY = (lyM * nosY * (dY * dY)) / 162;
      const weightX = (lxM * nosX * (dX * dX)) / 162;
      const totalKg = weightY + weightX;

      return { ...r, nosY, nosX, totalKg, weightY, weightX };
    });

    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    results.forEach(res => {
      summary[parseInt(res.diaY)] += res.weightY;
      summary[parseInt(res.diaX)] += res.weightX;
    });

    return { results, summary };
  }, [rows]);

  const updateRow = (id: number, field: keyof SlabRow, val: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  const shareToWhatsApp = () => {
    let message = `*UNiQ DESIGNS - SLAB BBS REPORT*%0A%0A`;
    computedData.results.forEach(r => {
      message += `*${r.tag}*: ${r.lyFt}'x${r.lxFt}'%0A- Ly: ${r.diaY}mm @ ${r.spY}" (${r.nosY} nos)%0A- Lx: ${r.diaX}mm @ ${r.spX}" (${r.nosX} nos)%0A- Weight: *${r.totalKg.toFixed(2)} KG*%0A%0A`;
    });
    const total = Object.values(computedData.summary).reduce((a, b) => a + b, 0);
    message += `*TOTAL PROJECT STEEL:* ${total.toFixed(2)} KG`;
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: '"Inter", system-ui, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '30px' }}>
      {/* Professional Header */}
      <header style={{ backgroundColor: '#92d050', padding: '20px 10px', textAlign: 'center', borderBottom: '4px solid #76b041' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#000', letterSpacing: '1px' }}>SLAB BBS CALCULATOR</h1>
        <p style={{ margin: '5px 0 0', fontSize: '12px', fontWeight: '600', opacity: 0.8 }}>UNiQ DESIGNS AUTOMATION</p>
      </header>

      <div style={{ padding: '15px' }}>
        {rows.map((row, idx) => {
          const res = computedData.results[idx];
          return (
            <div key={row.id} style={{ backgroundColor: '#00b0f0', borderRadius: '15px', border: '2px solid #0070c0', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
              {/* Card Header */}
              <div style={{ backgroundColor: '#0070c0', color: '#fff', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>SLAB DATA - {row.tag}</span>
                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={{ background: '#ff4d4d', border: 'none', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              </div>

              {/* Input Grid */}
              <div style={{ padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Ly (Ft)</label>
                  <input type="number" value={row.lyFt} onChange={e => updateRow(row.id, 'lyFt', e.target.value)} style={inputStyle} />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Lx (Ft)</label>
                  <input type="number" value={row.lxFt} onChange={e => updateRow(row.id, 'lxFt', e.target.value)} style={inputStyle} />
                </div>

                {/* Reinforcement Ly */}
                <div style={{ ...inputGroupStyle, backgroundColor: '#e1f5fe' }}>
                  <label style={labelStyle}>Ly Dia & Spacing</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <select value={row.diaY} onChange={e => updateRow(row.id, 'diaY', e.target.value)} style={selectStyle}>
                      {ROD_OPTIONS.map(d => <option key={d} value={d}>{d}mm</option>)}
                    </select>
                    <input type="number" value={row.spY} onChange={e => updateRow(row.id, 'spY', e.target.value)} style={{ ...inputStyle, width: '50px' }} />
                  </div>
                </div>

                {/* Reinforcement Lx */}
                <div style={{ ...inputGroupStyle, backgroundColor: '#e1f5fe' }}>
                  <label style={labelStyle}>Lx Dia & Spacing</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <select value={row.diaX} onChange={e => updateRow(row.id, 'diaX', e.target.value)} style={selectStyle}>
                      {ROD_OPTIONS.map(d => <option key={d} value={d}>{d}mm</option>)}
                    </select>
                    <input type="number" value={row.spX} onChange={e => updateRow(row.id, 'spX', e.target.value)} style={{ ...inputStyle, width: '50px' }} />
                  </div>
                </div>
              </div>

              {/* Sub-Total Bar */}
              <div style={{ backgroundColor: '#ffff00', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #0070c0' }}>
                <div style={{ fontSize: '13px', fontWeight: '800' }}>
                  BARS: Y:{res.nosY} | X:{res.nosX}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#000' }}>
                  {res.totalKg.toFixed(2)} KG
                </div>
              </div>
            </div>
          );
        })}

        {/* Steel Summary Section */}
        <div style={{ backgroundColor: '#fff', borderRadius: '15px', border: '2px solid #0070c0', padding: '15px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '16px', textAlign: 'center', color: '#0070c0', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>PROJECT STEEL SUMMARY</h2>
          {Object.entries(computedData.summary).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #ddd' }}>
              <span style={{ fontWeight: '700', color: '#444' }}>{dia}mm Rebar:</span>
              <span style={{ fontWeight: '800', color: '#000' }}>{kg.toFixed(2)} KG</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', marginTop: '5px', borderTop: '2px solid #0070c0' }}>
            <span style={{ fontWeight: '900' }}>GRAND TOTAL:</span>
            <span style={{ fontWeight: '900', color: '#0070c0', fontSize: '18px' }}>
              {Object.values(computedData.summary).reduce((a, b) => a + b, 0).toFixed(2)} KG
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <button 
          onClick={() => setRows([...rows, { id: Date.now(), tag: `S${rows.length + 1}`, lyFt: '10', lxFt: '10', diaY: '8', spY: '6', diaX: '8', spX: '6' }])} 
          style={primaryBtnStyle}
        >
          + ADD NEW SLAB TYPE
        </button>

        <button onClick={shareToWhatsApp} style={whatsappBtnStyle}>
          SHARE REPORT TO WHATSAPP
        </button>
      </div>
    </div>
  );
}

// Styling Objects for cleaner code
const inputGroupStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '8px',
  borderRadius: '10px',
  display: 'flex',
  flexDirection: 'column'
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#666',
  marginBottom: '4px'
};

const inputStyle: React.CSSProperties = {
  border: 'none',
  fontSize: '16px',
  fontWeight: '900',
  outline: 'none',
  color: '#000',
  width: '100%'
};

const selectStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  fontSize: '15px',
  fontWeight: '900',
  color: '#0070c0',
  cursor: 'pointer'
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  backgroundColor: '#0070c0',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 'bold',
  fontSize: '14px',
  marginBottom: '12px',
  cursor: 'pointer',
  boxShadow: '0 4px 6px rgba(0,112,192,0.2)'
};

const whatsappBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  backgroundColor: '#25D366',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  fontWeight: 'bold',
  fontSize: '14px',
  cursor: 'pointer',
  boxShadow: '0 4px 6px rgba(37,211,102,0.2)'
};
