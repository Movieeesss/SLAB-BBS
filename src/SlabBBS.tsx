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
    { id: 1, tag: 'S1', lyFt: '12', lxFt: '10', diaY: '8', spY: '6', diaX: '10', spX: '6' }
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

      // Bar count logic: (Length / Spacing) + 1
      const nosY = spY > 0 ? Math.floor(lyM / (spY / 12 / 3.281)) + 1 : 0;
      const nosX = spX > 0 ? Math.floor(lxM / (spX / 12 / 3.281)) + 1 : 0;

      // D^2 / 162 Weight Formula
      const weightY = (lyM * nosY * (dY * dY)) / 162;
      const weightX = (lxM * nosX * (dX * dX)) / 162;
      const totalKg = weightY + weightX;

      return { ...r, nosY, nosX, totalKg, weightY, weightX };
    });

    // Diameter-wise Summary Aggregator
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

  const generateFinalPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("SLAB BBS FINAL REPORT", 105, 15, { align: "center" });

    // Individual Slab Breakdown Table
    autoTable(doc, {
      startY: 25,
      head: [['Slab', 'Size (Ft)', 'Ly Reinforcement', 'Lx Reinforcement', 'Total Weight']],
      body: computedData.results.map(r => [
        r.tag,
        `${r.lyFt}' x ${r.lxFt}'`,
        `${r.diaY}mm @ ${r.spY}"`,
        `${r.diaX}mm @ ${r.spX}"`,
        `${r.totalKg.toFixed(2)} KG`
      ]),
      headStyles: { fillColor: [0, 112, 192] },
      theme: 'grid'
    });

    // Diameter-wise Summary Table
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("FINAL STEEL SUMMARY", 14, finalY);
    
    const summaryRows = Object.entries(computedData.summary)
      .filter(([_, kg]) => kg > 0)
      .map(([dia, kg]) => [`${dia}mm Rebar`, `${kg.toFixed(2)} KG`]);

    const grandTotal = Object.values(computedData.summary).reduce((a, b) => a + b, 0);
    summaryRows.push([{ content: 'GRAND TOTAL', styles: { fontStyle: 'bold' } }, { content: `${grandTotal.toFixed(2)} KG`, styles: { fontStyle: 'bold' } }]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Diameter', 'Total Quantity']],
      body: summaryRows,
      headStyles: { fillColor: [146, 208, 80] },
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
            <div key={row.id} style={{ backgroundColor: '#00b0f0', borderRadius: '12px', border: '2px solid #0070c0', marginBottom: '15px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#0070c0', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold' }}>DATA - {row.tag}</span>
                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={{ background: 'red', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>REMOVE</button>
              </div>

              <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={inputBox}><label style={lbl}>Ly (Ft)</label><input type="number" value={row.lyFt} onChange={e => updateRow(row.id, 'lyFt', e.target.value)} style={inpt} /></div>
                <div style={inputBox}><label style={lbl}>Lx (Ft)</label><input type="number" value={row.lxFt} onChange={e => updateRow(row.id, 'lxFt', e.target.value)} style={inpt} /></div>
                
                <div style={blueBox}>
                  <label style={lbl}>Ly Reinforcement</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <select value={row.diaY} onChange={e => updateRow(row.id, 'diaY', e.target.value)} style={sel}>
                      {ROD_OPTIONS.map(d => <option key={d} value={d}>{d}mm</option>)}
                    </select>
                    <input type="number" value={row.spY} onChange={e => updateRow(row.id, 'spY', e.target.value)} style={inptSmall} />
                  </div>
                </div>

                <div style={blueBox}>
                  <label style={lbl}>Lx Reinforcement</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <select value={row.diaX} onChange={e => updateRow(row.id, 'diaX', e.target.value)} style={sel}>
                      {ROD_OPTIONS.map(d => <option key={d} value={d}>{d}mm</option>)}
                    </select>
                    <input type="number" value={row.spX} onChange={e => updateRow(row.id, 'spX', e.target.value)} style={inptSmall} />
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffff00', padding: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: '900' }}>
                <span>Nos: Y:{res.nosY} / X:{res.nosX}</span>
                <span>{res.totalKg.toFixed(2)} KG</span>
              </div>
            </div>
          );
        })}

        {/* Professional Summary Card */}
        <div style={{ background: '#fff', border: '2px solid #0070c0', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', textAlign: 'center', borderBottom: '2px solid #eee', paddingBottom: '5px' }}>FINAL STEEL REPORT</h2>
          {Object.entries(computedData.summary).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #ccc' }}>
              <span style={{ fontWeight: 'bold' }}>{dia}mm Steel:</span>
              <span style={{ fontWeight: 'bold' }}>{kg.toFixed(2)} KG</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #0070c0', fontWeight: '900', fontSize: '18px' }}>
            <span>GRAND TOTAL:</span>
            <span>{Object.values(computedData.summary).reduce((a, b) => a + b, 0).toFixed(2)} KG</span>
          </div>
        </div>

        <button onClick={() => setRows([...rows, { id: Date.now(), tag: `S${rows.length + 1}`, lyFt: '10', lxFt: '10', diaY: '8', spY: '6', diaX: '8', spX: '6' }])} style={btnBlue}>+ ADD NEW SLAB TYPE</button>
        <button onClick={generateFinalPDF} style={btnBlack}>DOWNLOAD FINAL REPORT PDF</button>
      </div>
    </div>
  );
}

// Minimalist Styles
const inputBox: React.CSSProperties = { background: '#fff', padding: '8px', borderRadius: '6px' };
const blueBox: React.CSSProperties = { background: '#e1f5fe', padding: '8px', borderRadius: '6px' };
const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 'bold', display: 'block', color: '#666' };
const inpt: React.CSSProperties = { border: 'none', fontSize: '16px', fontWeight: 'bold', width: '100%', outline: 'none' };
const inptSmall: React.CSSProperties = { border: 'none', fontSize: '16px', fontWeight: 'bold', width: '40px', background: 'transparent' };
const sel: React.CSSProperties = { border: 'none', fontWeight: 'bold', background: 'transparent', fontSize: '15px' };
const btnBlue: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#0070c0', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' };
const btnBlack: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#222', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' };
