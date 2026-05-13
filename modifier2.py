import re

file_path = '/Volumes/T7 90998167/Antigravity/LPMitTOMS/.temp_co2/src/App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update INITIAL_FORM_DATA
new_initial_data = '''
export const WORK_CATEGORIES = [
  { id: 'cat1', name: '1. Site Clearance' },
  { id: 'cat2', name: '2. Earthworks' },
  { id: 'cat3', name: '3. Soil Nails' },
  { id: 'cat4', name: '4. Rock Dowels / Bolts' },
  { id: 'cat5', name: '5. Retaining Walls' },
  { id: 'cat6', name: '6. Skin Walls' },
  { id: 'cat7', name: '7. Raft Foundations' },
  { id: 'cat8', name: '8. Flexible Debris Resisting Barriers' },
  { id: 'cat9', name: '9. Rigid Debris Resisting Barriers' },
  { id: 'cat10', name: '10. Surface Drainage' },
  { id: 'cat11', name: '11. Sub-surface Drainage' },
  { id: 'cat12', name: '12. Rockfall Mitigation' },
  { id: 'cat13', name: '13. Bio-engineering / Landscaping' },
  { id: 'trial1', name: 'Site Trial 1: GFRP Soil Nail' },
  { id: 'trial2', name: 'Site Trial 2: Skin Wall with GGBS Concrete' }
];

const INITIAL_CATEGORY_DATA = {
  soilNailSteel: '', soilNailGrout: '', massConcrete: '', namiConcrete: '', noFineConcrete: '',
  cementGroutBackfill: '', reinforcedConcrete: '', steelRebar: '', recompactingSoil: '',
  diesel: '', biofuel: '', biofuelGrade: '', electricity: '', bessElectricity: '', water: '',
  waste1Trips: '', waste1Location: '', waste1Distance: '', waste1Weight: '',
  waste2Trips: '', waste2Location: '', waste2Distance: '', waste2Weight: '',
  contractCarsNonElectric: '', petrol: '', contractCarsElectric: '', evElectricity: '', labourCount: ''
};

const INITIAL_FORM_DATA = {
  monthYear: '',
  categories: WORK_CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = { ...INITIAL_CATEGORY_DATA };
    return acc;
  }, {})
};
'''
code = re.sub(r'const INITIAL_FORM_DATA = \{[\s\S]*?\n\};\n', new_initial_data + '\n', code, count=1)

# 2. Add state
state_add = '''
  const [activeWorkCat, setActiveWorkCat] = useState('cat1');
  const [activeTab, setActiveTab] = useState('materials');
  const [selectedRecords, setSelectedRecords] = useState([]);
'''
code = re.sub(r'const \[activeTab, setActiveTab\] = useState\(\'materials\'\);', state_add, code, count=1)

# 3. Handle Form Change
handle_form_replace = '''
  const handleFormChange = (e) => {
    if (e.target.name === 'monthYear') {
      setFormData({ ...formData, monthYear: e.target.value });
    } else {
      setFormData(prev => {
        const catData = prev.categories?.[activeWorkCat] || {};
        return {
          ...prev,
          categories: {
            ...prev.categories,
            [activeWorkCat]: { ...catData, [e.target.name]: e.target.value }
          }
        };
      });
    }
  };
'''
code = re.sub(r'const handleFormChange = \(e\) => \{[\s\S]*?\}\;', handle_form_replace, code)

# 4. Batch Delete
batch_delete_func = '''
  const toggleRecordSelect = (monthYear) => {
    setSelectedRecords(prev => prev.includes(monthYear) ? prev.filter(id => id !== monthYear) : [...prev, monthYear]);
  };
  const toggleAllRecords = () => {
    if (selectedRecords.length === records.length) setSelectedRecords([]);
    else setSelectedRecords(records.map(r => r.monthYear));
  };
  const batchDelete = async () => {
    if (!user || selectedRecords.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRecords.length} records?`)) return;
    try {
      for (const monthYear of selectedRecords) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'records', monthYear));
      }
      setSelectedRecords([]);
      showNotification(`Successfully deleted ${selectedRecords.length} records.`);
    } catch (error) {
      console.error(error);
      showNotification('Failed to delete some records.');
    }
  };
'''
code = re.sub(r'const deleteRecord = async', batch_delete_func + '\n  const deleteRecord = async', code, count=1)

# 5. Edit Record Mapping
edit_record_replace = '''
  const editRecord = (record) => {
    let fullRecord = { ...INITIAL_FORM_DATA, monthYear: record.monthYear };
    if (record.categories) {
      fullRecord.categories = { ...INITIAL_FORM_DATA.categories };
      for (const catId of Object.keys(record.categories)) {
        fullRecord.categories[catId] = { ...INITIAL_CATEGORY_DATA, ...record.categories[catId] };
      }
    } else {
      // Legacy data
      fullRecord.categories['cat1'] = { ...INITIAL_CATEGORY_DATA, ...record };
    }
    setFormData(fullRecord);
    setActiveWorkCat('cat1');
    setActiveTab('materials');
    setIsModalOpen(true);
  };
'''
code = re.sub(r'const editRecord = \(record\) => \{[\s\S]*?setIsModalOpen\(true\);\n  \};', edit_record_replace, code)

# 6. Table Select All
table_header_replace = '''
                <div className="flex gap-2">
                  {selectedRecords.length > 0 && (
                    <button onClick={batchDelete} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm">
                      Delete Selected ({selectedRecords.length})
                    </button>
                  )}
                  <button 
                    onClick={() => { setFormData(INITIAL_FORM_DATA); setIsModalOpen(true); }}
'''
code = code.replace('<button \n                  onClick={() => { setFormData(INITIAL_FORM_DATA); setIsModalOpen(true); }}', table_header_replace)

thead_replace = '''
                      <tr>
                        <th className="px-4 py-3 text-left w-10">
                          <input type="checkbox" checked={records.length > 0 && selectedRecords.length === records.length} onChange={toggleAllRecords} className="rounded text-emerald-600 focus:ring-emerald-500" />
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">Month</th>
'''
code = code.replace('<tr>\n                        <th className="px-6 py-3 text-left font-semibold">Month</th>', thead_replace)

tbody_replace = '''
                        <tr key={record.monthYear} className={`transition-colors ${selectedRecords.includes(record.monthYear) ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-4">
                            <input type="checkbox" checked={selectedRecords.includes(record.monthYear)} onChange={() => toggleRecordSelect(record.monthYear)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">{record.monthYear}</td>
'''
code = re.sub(r'<tr key=\{record\.monthYear\} className="hover:bg-slate-50 transition-colors">\n\s*<td className="px-6 py-4 font-medium text-slate-900">\{record\.monthYear\}</td>', tbody_replace, code)

# 7. Modify all formData.xxx values in the Modal
# Only replace ones that are formData.X where X is one of the data fields
data_fields = ['soilNailSteel', 'soilNailGrout', 'massConcrete', 'namiConcrete', 'noFineConcrete',
  'cementGroutBackfill', 'reinforcedConcrete', 'steelRebar', 'recompactingSoil',
  'diesel', 'biofuel', 'biofuelGrade', 'electricity', 'bessElectricity', 'water',
  'waste1Trips', 'waste1Location', 'waste1Distance', 'waste1Weight',
  'waste2Trips', 'waste2Location', 'waste2Distance', 'waste2Weight',
  'contractCarsNonElectric', 'petrol', 'contractCarsElectric', 'evElectricity', 'labourCount']

for field in data_fields:
    code = code.replace(f'formData.{field}', f'(formData.categories?.[activeWorkCat] || {{}}).{field}')

# 8. Add 15 Tabs sidebar in Modal
sidebar_replace = '''
              {/* Sidebar Tabs */}
              <div className="w-full sm:w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-2 overflow-y-auto">
                {WORK_CATEGORIES.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setActiveWorkCat(cat.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded mb-1 transition-colors ${activeWorkCat === cat.id ? 'bg-emerald-600 text-white font-medium shadow' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Form Content */}
              <div className="flex-1 p-6 bg-white overflow-y-auto">
                <div className="mb-6 max-w-sm">
                  <InputField label="Record Month / Year *" name="monthYear" type="month" value={formData.monthYear} onChange={handleFormChange} required />
                </div>
                
                <h3 className="text-xl font-bold mb-4 text-slate-800 pb-2 border-b">{WORK_CATEGORIES.find(c => c.id === activeWorkCat)?.name}</h3>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <TabButton active={activeTab === 'materials'} onClick={() => setActiveTab('materials')} icon={<HardHat />} label="Materials" />
                  <TabButton active={activeTab === 'operations'} onClick={() => setActiveTab('operations')} icon={<Zap />} label="Energy" />
                  <TabButton active={activeTab === 'water'} onClick={() => setActiveTab('water')} icon={<Leaf />} label="Water" />
                  <TabButton active={activeTab === 'transport'} onClick={() => setActiveTab('transport')} icon={<Truck />} label="Waste & Transport" />
                </div>
'''
code = re.sub(r'\{\/\* Sidebar Tabs \*\/\}(.|\n)*?<div className="mb-8 max-w-sm">(.|\n)*?<\/div>', sidebar_replace, code)

# 9. Ensure Water Sub-tab logic exists
water_tab = '''
                {activeTab === 'water' && (
                  <div className="space-y-8 animate-fade-in">
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Water Consumption</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Fresh Water (Litre)" name="water" type="number" value={(formData.categories?.[activeWorkCat] || {}).water} onChange={handleFormChange} />
                      </div>
                    </div>
                  </div>
                )}
'''
code = code.replace('{activeTab === \'transport\' && (', water_tab + '\n                {activeTab === \'transport\' && (')

# Remove the old water input from operations tab
code = re.sub(r'<InputField label="Fresh Water \(Litre\)" name="water" type="number".*?/>', '', code)
code = re.sub(r'<h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Electricity & Water Consumptions</h3>', '<h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Electricity Consumptions</h3>', code)

# 10. Fix Analysis and Totals in tables
totals_fix = '''
  const getAggregated = (record, field) => {
    if (!record.categories) return Number(record[field] || 0);
    return Object.values(record.categories).reduce((sum, cat) => sum + Number(cat[field] || 0), 0);
  };
'''
code = re.sub(r'const deleteRecord = async \(monthYear\) => \{', totals_fix + '\n  const deleteRecord = async (monthYear) => {', code)

table_vars_fix = '''
                            {(getAggregated(record, 'massConcrete') + getAggregated(record, 'reinforcedConcrete') + getAggregated(record, 'namiConcrete') + getAggregated(record, 'noFineConcrete')).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            {(getAggregated(record, 'soilNailSteel') + getAggregated(record, 'steelRebar')).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">{(getAggregated(record, 'diesel') + getAggregated(record, 'biofuel')).toFixed(2)}</td>
                          <td className="px-6 py-4">{(getAggregated(record, 'electricity') + getAggregated(record, 'bessElectricity') + getAggregated(record, 'evElectricity')).toFixed(2)}</td>
'''
code = re.sub(r'\{\(Number\(record\.massConcrete \|\| 0\).*?\)\.toFixed\(2\)\}\n\s*<\/td>\n\s*<td className="px-6 py-4">\n\s*\{\(Number\(record\.soilNailSteel.*?\)\.toFixed\(2\)\}\n\s*<\/td>\n\s*<td className="px-6 py-4">\{\(Number\(record\.diesel.*?\.toFixed\(2\)\}<\/td>\n\s*<td className="px-6 py-4">\{\(Number\(record\.electricity.*?\.toFixed\(2\)\}<\/td>', table_vars_fix, code)

# Excel Export Fixes
excel_fix = '''
    const formattedRecords = records.map(r => {
      const agg = { ...INITIAL_CATEGORY_DATA };
      if (r.categories) {
        Object.values(r.categories).forEach(cat => {
          Object.keys(cat).forEach(k => { agg[k] = Number(agg[k] || 0) + Number(cat[k] || 0); });
        });
      } else {
        Object.keys(agg).forEach(k => { agg[k] = Number(r[k] || 0); });
      }
      return {
        'Month / Year': r.monthYear,
        'Solid Steel Bar (kg)': agg.soilNailSteel,
        'Cement Grout (kg)': agg.soilNailGrout,
        'Mass Concrete (m³)': agg.massConcrete,
        'Nami Concrete (m³)': agg.namiConcrete,
        'No-fine Concrete (m³)': agg.noFineConcrete,
        'Cement Grout Backfill (m³/kg)': agg.cementGroutBackfill,
        'Reinforced Concrete (m³)': agg.reinforcedConcrete,
        'Steel Rebar (kg)': agg.steelRebar,
        'Recompacting Soil (m³)': agg.recompactingSoil,
        'Diesel Fuel (L)': agg.diesel,
        'Biofuel (L)': agg.biofuel,
        'Biofuel Grade': agg.biofuelGrade || '',
        'Grid Electricity (kWh)': agg.electricity,
        'BESS Electricity (kWh)': agg.bessElectricity,
        'Fresh Water (L)': agg.water,
        'Waste Stream 1 - Trips': agg.waste1Trips,
        'Waste Stream 1 - Location': r.waste1Location || '',
        'Waste Stream 1 - Distance (km)': agg.waste1Distance,
        'Waste Stream 1 - Weight (kg)': agg.waste1Weight,
        'Waste Stream 2 - Trips': agg.waste2Trips,
        'Waste Stream 2 - Location': r.waste2Location || '',
        'Waste Stream 2 - Distance (km)': agg.waste2Distance,
        'Waste Stream 2 - Weight (kg)': agg.waste2Weight,
        'Non-Electric Contract Cars': agg.contractCarsNonElectric,
        'Petrol (L)': agg.petrol,
        'Electric Contract Cars': agg.contractCarsElectric,
        'EV Electricity (kWh)': agg.evElectricity,
        'Average Labour per Day': agg.labourCount
      };
    });
'''
code = re.sub(r'const formattedRecords = records\.map\(r => \(\{[\s\S]*?\}\)\);', excel_fix, code)

# Analysis Fix
analysis_fix = '''
function AnalysisDashboard({ records }) {
  const totals = records.reduce((acc, r) => {
    if (r.categories) {
      Object.values(r.categories).forEach(curr => {
        acc.concrete += Number(curr.massConcrete || 0) + Number(curr.reinforcedConcrete || 0) + Number(curr.namiConcrete || 0) + Number(curr.noFineConcrete || 0);
        acc.steel += Number(curr.soilNailSteel || 0) + Number(curr.steelRebar || 0);
        acc.electricity += Number(curr.electricity || 0) + Number(curr.bessElectricity || 0) + Number(curr.evElectricity || 0);
        acc.diesel += Number(curr.diesel || 0);
        acc.petrol += Number(curr.petrol || 0);
      });
    } else {
        const curr = r;
        acc.concrete += Number(curr.massConcrete || 0) + Number(curr.reinforcedConcrete || 0) + Number(curr.namiConcrete || 0) + Number(curr.noFineConcrete || 0);
        acc.steel += Number(curr.soilNailSteel || 0) + Number(curr.steelRebar || 0);
        acc.electricity += Number(curr.electricity || 0) + Number(curr.bessElectricity || 0) + Number(curr.evElectricity || 0);
        acc.diesel += Number(curr.diesel || 0);
        acc.petrol += Number(curr.petrol || 0);
    }
    return acc;
  }, { concrete: 0, steel: 0, electricity: 0, diesel: 0, petrol: 0 });

  const maxConcrete = Math.max(...records.map(r => {
    if (r.categories) return Object.values(r.categories).reduce((sum, c) => sum + Number(c.massConcrete || 0) + Number(c.reinforcedConcrete || 0) + Number(c.namiConcrete || 0) + Number(c.noFineConcrete || 0), 0);
    return Number(r.massConcrete || 0) + Number(r.reinforcedConcrete || 0) + Number(r.namiConcrete || 0) + Number(r.noFineConcrete || 0);
  }), 1);
'''
code = re.sub(r'function AnalysisDashboard\(\{ records \}\) \{[\s\S]*?const maxConcrete = Math\.max\(\.\.\.records\.map\(r => [^\)]+\), 1\);', analysis_fix, code)

analysis_bars_fix = '''
            {records.map((record) => {
              const val = record.categories ? Object.values(record.categories).reduce((s, c) => s + Number(c.massConcrete || 0) + Number(c.reinforcedConcrete || 0) + Number(c.namiConcrete || 0) + Number(c.noFineConcrete || 0), 0) : Number(record.massConcrete || 0) + Number(record.reinforcedConcrete || 0) + Number(record.namiConcrete || 0) + Number(record.noFineConcrete || 0);
              const heightPercent = Math.max((val / maxConcrete) * 100, 5);
'''
code = re.sub(r'\{records\.map\(\(record\) => \{\n\s*const val = Number\(record\.massConcrete \|\| 0\).*?\n\s*const heightPercent = Math\.max\(\(val / maxConcrete\) \* 100, 5\);', analysis_bars_fix, code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Modification complete.")
