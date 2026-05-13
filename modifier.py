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
  diesel: '', biofuel: '', biofuelGrade: '', electricity: '', bessElectricity: '',
  water: '', waste1Trips: '', waste1Location: '', waste1Distance: '', waste1Weight: '',
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

# 2. Add selectedRecords state and UI in App component
state_add = '''
  const [activeTab, setActiveTab] = useState('cat1');
  const [activeSubTab, setActiveSubTab] = useState('materials');
  const [selectedRecords, setSelectedRecords] = useState([]);
'''
code = re.sub(r'const \[activeTab, setActiveTab\] = useState\(\'materials\'\);', state_add, code, count=1)

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

# 3. Update the table to include checkboxes and calculate values from categories
table_header_replace = '''
                <div className="flex items-center gap-4">
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
                        <tr key={record.monthYear} className={`transition-colors ${selectedRecords.includes(record.monthYear) ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-4">
                            <input type="checkbox" checked={selectedRecords.includes(record.monthYear)} onChange={() => toggleRecordSelect(record.monthYear)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">{record.monthYear}</td>
'''
code = re.sub(r'<tr key=\{record\.monthYear\} className="hover:bg-slate-50 transition-colors">\n\s*<td className="px-6 py-4 font-medium text-slate-900">\{record\.monthYear\}</td>', tbody_replace, code)

# Fix editRecord backwards compatibility
edit_record_replace = '''
  const editRecord = (record) => {
    let fullRecord = { ...INITIAL_FORM_DATA, monthYear: record.monthYear };
    if (record.categories) {
      fullRecord.categories = { ...INITIAL_FORM_DATA.categories };
      for (const catId of Object.keys(record.categories)) {
        fullRecord.categories[catId] = { ...INITIAL_CATEGORY_DATA, ...record.categories[catId] };
      }
    } else {
      // Legacy data migration
      fullRecord.categories['cat1'] = { ...INITIAL_CATEGORY_DATA, ...record };
    }
    setFormData(fullRecord);
    setIsModalOpen(true);
  };
'''
code = re.sub(r'const editRecord = \(record\) => \{[\s\S]*?setIsModalOpen\(true\);\n  \};', edit_record_replace, code)

# 4. Modify HandleFormChange to support nested fields
handle_form_replace = '''
  const handleFormChange = (e) => {
    if (e.target.name === 'monthYear') {
      setFormData({ ...formData, monthYear: e.target.value });
    } else {
      setFormData(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [activeTab]: {
            ...prev.categories[activeTab],
            [e.target.name]: e.target.value
          }
        }
      }));
    }
  };
'''
code = re.sub(r'const handleFormChange = \(e\) => \{[\s\S]*?\}\;', handle_form_replace, code)

# Update Analysis to use categories
analysis_replace = '''
function AnalysisDashboard({ records }) {
  const totals = records.reduce((acc, curr) => {
    if (!curr.categories) return acc;
    Object.values(curr.categories).forEach(cat => {
      acc.concrete += Number(cat.massConcrete || 0) + Number(cat.reinforcedConcrete || 0) + Number(cat.namiConcrete || 0) + Number(cat.noFineConcrete || 0);
      acc.steel += Number(cat.soilNailSteel || 0) + Number(cat.steelRebar || 0);
      acc.electricity += Number(cat.electricity || 0) + Number(cat.bessElectricity || 0) + Number(cat.evElectricity || 0);
      acc.diesel += Number(cat.diesel || 0);
      acc.petrol += Number(cat.petrol || 0);
    });
    return acc;
  }, { concrete: 0, steel: 0, electricity: 0, diesel: 0, petrol: 0 });

  const maxConcrete = Math.max(...records.map(r => {
    if (!r.categories) return 0;
    return Object.values(r.categories).reduce((sum, cat) => sum + Number(cat.massConcrete || 0) + Number(cat.reinforcedConcrete || 0) + Number(cat.namiConcrete || 0) + Number(cat.noFineConcrete || 0), 0);
  }), 1);
'''
code = re.sub(r'function AnalysisDashboard\(\{ records \}\) \{[\s\S]*?return \(\n    <div className="space-y-6', analysis_replace + '\n  return (\n    <div className="space-y-6', code)

# Fix record values in table
code = re.sub(r'Number\(record\.massConcrete \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.massConcrete || 0), 0)', code)
code = re.sub(r'Number\(record\.reinforcedConcrete \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.reinforcedConcrete || 0), 0)', code)
code = re.sub(r'Number\(record\.namiConcrete \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.namiConcrete || 0), 0)', code)
code = re.sub(r'Number\(record\.noFineConcrete \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.noFineConcrete || 0), 0)', code)
code = re.sub(r'Number\(record\.soilNailSteel \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.soilNailSteel || 0), 0)', code)
code = re.sub(r'Number\(record\.steelRebar \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.steelRebar || 0), 0)', code)
code = re.sub(r'Number\(record\.diesel \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.diesel || 0), 0)', code)
code = re.sub(r'Number\(record\.biofuel \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.biofuel || 0), 0)', code)
code = re.sub(r'Number\(record\.electricity \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.electricity || 0), 0)', code)
code = re.sub(r'Number\(record\.bessElectricity \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.bessElectricity || 0), 0)', code)
code = re.sub(r'Number\(record\.evElectricity \|\| 0\)', r'Object.values(record.categories || {}).reduce((s, c) => s + Number(c.evElectricity || 0), 0)', code)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Modification complete.")
