import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Reference data from your Excel 'SWITCH' formulas
const STEEL_REF: Record<number, { rods: number; bundleWeight: number }> = {
  8:  { rods: 10, bundleWeight: 47.4 },
  10: { rods: 7,  bundleWeight: 51.87 },
  12: { rods: 5,  bundleWeight: 53.35 },
  16: { rods: 3,  bundleWeight: 56.88 },
  20: { rods: 2,  bundleWeight: 59.26 },
  25: { rods: 1,  bundleWeight: 46.3 },
};

export default function SlabBBSCalculator() {
  const [rows, setRows] = useState<any[]>([
    { id: 1, tag: 'S1', lyFt: '25.75', lxFt: '9.74', diaY: '8', spY: '5', diaX: '10', spX: '5' }
  ]);

  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const lyFt = parseFloat(r.lyFt) || 0;
      const lxFt = parseFloat(r.lxFt) || 0;
      const spY = parseFloat(r.spY) || 0;
      const spX = parseFloat(r.spX) || 0;
      const dY = parseInt(r.diaY);
      const dX = parseInt(r.diaX);

      // 1. Convert Ft to Meters (Excel: /3.281)
      const lyM = lyFt / 3.281;
      const lxM = lxFt / 3.281;

      // 2. Calculate Numbers (Excel: Length / (Spacing/12/3.281) + 1)
      const nosY = spY > 0 ? Math.ceil(lyM / (spY / 12 / 3.281)) + 1 : 0;
      const nosX = spX > 0 ? Math.ceil(lxM / (spX / 12 / 3.281)) + 1 : 0;

      // 3. Total Length in Meters
      const totalLenY = lyM * nosY;
      const totalLenX = lxM * nosX;

      // 4. Bundle Logic (Excel: TotalLen / Rods_per_bundle / 12 * Bundle_Weight)
      // Note: In your Excel, Rods are 12m long usually.
      const refY = STEEL_REF[dY];
      const refX = STEEL_REF[dX];

      const bundlesY = refY ? (totalLenY / 12 / refY.rods) : 0;
      const bundlesX = refX ? (totalLenX / 12 / refX.rods) : 0;

      const kgY = bundlesY * (refY?.bundleWeight || 0);
      const kgX = bundlesX * (refX?.bundleWeight || 0);

      return { ...r, nosY, nosX, kgY, kgX, totalKg: kgY + kgX };
    });

    // Summary calculation
    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    results.forEach(res => {
      summary[parseInt(res.diaY)] += res.kgY;
      summary[parseInt(res.diaX)] += res.kgX;
    });

    return { results, summary };
  }, [rows]);

  const addRow = () => setRows([...rows, { 
    id: Date.now(), tag: `S${rows.length + 1}`, lyFt: '10', lxFt: '10', diaY: '8', spY: '6', diaX: '8', spX: '6' 
  }]);

  const updateRow = (id: number, field: string, val: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("ROOF SLAB STEEL QUANTITY REPORT", 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Slab', 'Size (Ft)', 'Ly Reinforcement', 'Lx Reinforcement', 'Total KG']],
      body: computedData.results.map(r => [
        r.tag, `${r.lyFt}x${r.lxFt}`, `${r.diaY}mm @ ${r.spY}"`, `${r.diaX}mm @ ${r.spX}"`, r.totalKg.toFixed(2)
      ]),
      headStyles: { fillColor: [146, 208, 80] }
    });
    doc.save("Slab_BBS_Report.pdf");
  };

  return (
    <div style={{ maxWidth: '450px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', minHeight: '100vh', paddingBottom: '40px' }}>
      <header style={{ backgroundColor: '#92d050', padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '20px', borderBottom: '4px solid #76b041' }}>
        SLAB BBS CALCULATOR
      </header>

      <div style={{ padding: '10px' }}>
        {rows.map((row, idx) => {
          const res = computedData.results[idx];
          return (
            <div key={row.id} style={{ marginBottom: '15px', border: '1px solid #0070c0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#0070c0', color: 'white', padding: '5px 10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>SLAB DATA - {row.tag}</span>
                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} style={{ background: 'red', border: 'none', color: 'white', cursor: 'pointer' }}>X</button>
              </div>

              <div style={{ backgroundColor: '#00b0f0', padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'white', padding: '5px', borderRadius: '4px' }}>
                  <label style={{ fontSize: '10px', display: 'block' }}>Ly (Ft)</label>
                  <input type="text" value={row.lyFt} onChange={e => updateRow(row.id, 'lyFt', e.target.value)} style={{ width: '90%', border: 'none', fontWeight: 'bold' }} />
                </div>
                <div style={{ background: 'white', padding: '5px', borderRadius: '4px' }}>
                  <label style={{ fontSize: '10px', display: 'block' }}>Lx (Ft)</label>
                  <input type="text" value={row.lxFt} onChange={e => updateRow(row.id, 'lxFt', e.target.value)} style={{ width: '90%', border: 'none', fontWeight: 'bold' }} />
                </div>
                
                {/* Ly Reinforcement */}
                <div style={{ background: '#e1f5fe', padding: '5px', borderRadius: '4px' }}>
                  <label style={{ fontSize: '10px' }}>Ly Dia / Sp(in)</label>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <select value={row.diaY} onChange={e => updateRow(row.id, 'diaY', e.target.value)} style={{ width: '50%' }}>
                      {[8, 10, 12, 16].map(d => <option key={d} value={d}>{d}m</option>)}
                    </select>
                    <input type="text" value={row.spY} onChange={e => updateRow(row.id, 'spY', e.target.value)} style={{ width: '40%' }} />
                  </div>
                </div>

                {/* Lx Reinforcement */}
                <div style={{ background: '#e1f5fe', padding: '5px', borderRadius: '4px' }}>
                  <label style={{ fontSize: '10px' }}>Lx Dia / Sp(in)</label>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <select value={row.diaX} onChange={e => updateRow(row.id, 'diaX', e.target.value)} style={{ width: '50%' }}>
                      {[8, 10, 12, 16].map(d => <option key={d} value={d}>{d}m</option>)}
                    </select>
                    <input type="text" value={row.spX} onChange={e => updateRow(row.id, 'spX', e.target.value)} style={{ width: '40%' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#ffff00', fontSize: '12px', fontWeight: 'bold' }}>
                <span>Nos: Ly:{res.nosY} / Lx:{res.nosX}</span>
                <span>Sub-Total: {res.totalKg.toFixed(2)} KG</span>
              </div>
            </div>
          );
        })}

        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #0070c0' }}>
          <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', borderBottom: '1px solid #ccc' }}>STEEL SUMMARY</h4>
          {Object.entries(computedData.summary).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #eee' }}>
              <span style={{ fontWeight: 'bold' }}>{dia}mm:</span>
              <span>{kg.toFixed(2)} KG</span>
            </div>
          ))}
        </div>

        <button onClick={addRow} style={{ width: '100%', marginTop: '10px', padding: '12px', background: '#0070c0', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
          + ADD SLAB TYPE
        </button>

        <button onClick={generatePDF} style={{ width: '100%', marginTop: '10px', padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
          DOWNLOAD SUMMARY PDF
        </button>
      </div>
    </div>
  );
}