import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SlabRow {
  id: number;
  tag: string; // Editable Slab Name
  lyFt: string;
  lxFt: string;
  diaY: string;
  spYInch: string; // Spacing in Inches
  diaX: string;
  spXInch: string; // Spacing in Inches
}

const ROD_OPTIONS = [8, 10, 12, 16, 20, 25];

export default function SlabBBSCalculator() {
  const [rows, setRows] = useState<SlabRow[]>([
    { id: 1, tag: 'S1', lyFt: '12', lxFt: '10', diaY: '8', spYInch: '6', diaX: '10', spXInch: '6' }
  ]);

  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const lyFt = parseFloat(r.lyFt) || 0;
      const lxFt = parseFloat(r.lxFt) || 0;
      const spY = parseFloat(r.spYInch) || 0;
      const spX = parseFloat(r.spXInch) || 0;
      const dY = parseInt(r.diaY);
      const dX = parseInt(r.diaX);

      // Conversions
      const lyM = lyFt / 3.281;
      const lxM = lxFt / 3.281;

      // Bar count logic using Inch to Meter conversion for spacing:
      // Formula: (Length_Meters / (Spacing_Inches / 12 / 3.281)) + 1
      const nosY = spY > 0 ? Math.floor(lyM / (spY / 12 / 3.281)) + 1 : 0;
      const nosX = spX > 0 ? Math.floor(lxM / (spX / 12 / 3.281)) + 1 : 0;

      // D^2 / 162 Weight Formula
      const weightY = (lyM * nosY * (dY * dY)) / 162;
      const weightX = (lxM * nosX * (dX * dX)) / 162;
      const totalKg = weightY + weightX;

      return { ...r, nosY, nosX, totalKg, weightY, weightX };
    });

    // Summing by diameter for the final report
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
    let msg = `*SLAB BBS FINAL REPORT*%0A%0A`;
    computedData.results.forEach(r => {
      msg += `*${r.tag}* (${r.lyFt}'x${r.lxFt}')%0A`;
      msg += `Y: ${r.diaY}mm @ ${r.spYInch}" spacing (${r.nosY} nos)%0A`;
      msg += `X: ${r.diaX}mm @ ${r.spXInch}" spacing (${r.nosX} nos)%0A`;
      msg += `Weight: *${r.totalKg.toFixed(2)} KG*%0A%0A`;
    });
    msg += `*FINAL STEEL SUMMARY*%0A`;
    Object.entries(computedData.summary).forEach(([dia, kg]) => {
      if (kg > 0) msg += `${dia}mm Steel: ${kg.toFixed(2)} KG%0A`;
    });
    const grandTotal = Object.values(computedData.summary).reduce((a, b) => a + b, 0);
    msg += `%0A*TOTAL: ${grandTotal.toFixed(2)} KG*`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const generateFinalPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("SLAB BBS FINAL REPORT", 105, 15, { align: "center" });

    autoTable(doc, {
      startY: 25,
      head: [['Slab Name', 'Size (Ft)', 'Ly (Inch Sp.)', 'Lx (Inch Sp.)', 'Weight']],
      body: computedData.results.map(r => [
        r.tag, 
        `${r.lyFt}'x${r.lxFt}'`, 
        `${r.diaY}mm @ ${r.spYInch}"`, 
        `${r.diaX}mm @ ${r.spXInch}"`, 
        `${r.totalKg.toFixed(2)} KG`
      ]),
      headStyles: { fillColor: [0, 112, 192] },
      theme: 'grid'
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("FINAL STEEL SUMMARY", 14, finalY);
    const summaryBody: any[] = Object.entries(computedData.summary)
      .filter(([_, kg]) => kg > 0)
      .map(([dia, kg]) => [`${dia}mm Rebar`, `${kg.toFixed(2)} KG`]);

    const grandTotal = Object.values(computedData.summary).reduce((a, b) => a + b, 0);
    summaryBody.push([
      { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: `${grandTotal.toFixed(2)} KG`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Diameter', 'Total Quantity']],
      body: summaryBody,
      headStyles: { fillColor: [146, 208, 80], textColor: [0, 0, 0] },
      theme: 'striped'
    });

    doc.save("Slab_BBS_Final_Report.pdf");
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', paddingBottom: '40px' }}>
      <header style={{ backgroundColor: '#92d050', padding: '20px', textAlign: 'center', borderBottom: '5px solid #76b041' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#000' }}>SLAB BBS CALCULATOR</h1>
      </header>

      <div style={{ padding: '15px' }}>
        {rows.map((row, idx) => {
          const res = computedData.results[idx];
          return (
            <div key={row.id} style={{ backgroundColor: '#00b0f0', borderRadius: '12px', border: '2px solid #0070c0', marginBottom: '15px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              {/* EDITABLE SLAB NAME HEADER */}
              <div style={{ backgroundColor: '#0070c0', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={row.tag} 
                  onChange={e => updateRow(row.id, 'tag', e.target.value)} 
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid #fff', color: '#fff', fontWeight: 'bold', padding: '2px 5px', borderRadius: '4px', width: '130px', outline: 'none' }}
                  placeholder="Slab Name"
                />
                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={{ background: 'red', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px', fontWeight: 'bold' }}>REMOVE</button>
              </div>

              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={inputBox}><label style={lbl}>Ly Length (Ft)</label><input type="number" value={row.lyFt} onChange={e => updateRow(row.id, 'lyFt', e.target.value)} style={inpt} /></div>
                <div style={inputBox}><label style={lbl}>Lx Length (Ft)</label><input type="number" value={row.lxFt} onChange={e => updateRow(row.id, 'lxFt', e.target.value)} style={inpt} /></div>
                
                <div style={blueBox}>
                  <label style={lbl}>Ly Reinforcement (mm / Inch)</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <select value={row.diaY} onChange={e => updateRow(row.id, 'diaY', e.target.value)} style={sel}>
                      {ROD_OPTIONS.map(d => <option key={d} value={d}>{d}mm</option>)}
                    </select>
                    <input type="number" value={row.spYInch} onChange={e => updateRow(row.id, 'spYInch', e.target.value)} style={inptSmall} placeholder="Inch" />
                  </div>
                </div>

                <div style={blueBox}>
                  <label style={lbl}>Lx Reinforcement (mm / Inch)</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <select value={row.diaX} onChange={e => updateRow(row.id, 'diaX', e.target.value)} style={sel}>
                      {ROD_OPTIONS.map(d => <option key={d} value={d}>{d}mm</option>)}
                    </select>
                    <input type="number" value={row.spXInch} onChange={e => updateRow(row.id, 'spXInch', e.target.value)} style={inptSmall} placeholder="Inch" />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffff00', padding: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: '#000' }}>
                <span>Nos: Y:{res.nosY} / X:{res.nosX}</span>
                <span>{res.totalKg.toFixed(2)} KG</span>
              </div>
            </div>
          );
        })}

        <div style={{ background: '#fff', border: '2px solid #0070c0', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', textAlign: 'center', color: '#0070c0', borderBottom: '2px solid #eee', paddingBottom: '5px' }}>FINAL STEEL REPORT</h2>
          {Object.entries(computedData.summary).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #ccc' }}>
              <span style={{ fontWeight: 'bold', color: '#444' }}>{dia}mm Steel:</span>
              <span style={{ fontWeight: 'bold' }}>{kg.toFixed(2)} KG</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #0070c0', fontWeight: '900', fontSize: '20px' }}>
            <span>TOTAL:</span>
            <span>{Object.values(computedData.summary).reduce((a, b) => a + b, 0).toFixed(2)} KG</span>
          </div>
        </div>

        <button onClick={() => setRows([...rows, { id: Date.now(), tag: `S${rows.length + 1}`, lyFt: '10', lxFt: '10', diaY: '8', spYInch: '6', diaX: '8', spXInch: '6' }])} style={btnBlue}>+ ADD NEW SLAB TYPE</button>
        <button onClick={generateFinalPDF} style={btnBlack}>DOWNLOAD FINAL REPORT PDF</button>
        <button onClick={shareToWhatsApp} style={btnGreen}>SHARE TO WHATSAPP</button>
      </div>
    </div>
  );
}

// Internal Styles
const inputBox: React.CSSProperties = { background: '#fff', padding: '8px', borderRadius: '6px' };
const blueBox: React.CSSProperties = { background: '#e1f5fe', padding: '8px', borderRadius: '6px' };
const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 'bold', display: 'block', color: '#666' };
const inpt: React.CSSProperties = { border: 'none', fontSize: '17px', fontWeight: '900', width: '100%', outline: 'none' };
const inptSmall: React.CSSProperties = { border: 'none', fontSize: '17px', fontWeight: '900', width: '60px', background: 'transparent', outline: 'none' };
const sel: React.CSSProperties = { border: 'none', fontWeight: '900', background: 'transparent', fontSize: '15px', color: '#0070c0' };
const btnBlue: React.CSSProperties = { width: '100%', padding: '16px', backgroundColor: '#0070c0', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', marginBottom: '10px', fontSize: '14px' };
const btnBlack: React.CSSProperties = { width: '100%', padding: '16px', backgroundColor: '#222', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', marginBottom: '10px', fontSize: '14px' };
const btnGreen: React.CSSProperties = { width: '100%', padding: '16px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' };
