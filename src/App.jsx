import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { 
  Leaf, 
  Save, 
  Download, 
  Upload,
  Plus, 
  Trash2, 
  FileSpreadsheet,
  Building2,
  HardHat,
  Truck,
  Zap,
  X,
  Lock,
  User,
  BarChart3,
  LogOut,
  TrendingUp,
  Calculator,
  Target,
  Sliders,
  Cpu,
  Settings2,
  Gauge,
  Activity
} from 'lucide-react';

const INITIAL_PROJECT_INFO = {
  contractNo: 'GE/2025/10',
  featureNo: '',
  catchmentNo: '',
  siteAddress: '',
  worksBeginning: '',
  worksCompletion: ''
};

// Expanded to match the EXACT fields from the original Excel File

export const WORK_CATEGORIES = [
  { id: 'cat1', name: '1. Soil Nails', group: 'major' },
  { id: 'cat2', name: '2. Rock Dowels / Rock Bolts', group: 'major' },
  { id: 'cat3', name: '3. Buttresses', group: 'major' },
  { id: 'cat4', name: '4. Rock Dentition', group: 'major' },
  { id: 'cat5', name: '5. Fill Slopes', group: 'major' },
  { id: 'cat6', name: '6. Wall Thickening / Skin Walls', group: 'major' },
  { id: 'cat7', name: '7. Retaining Walls', group: 'major' },
  { id: 'cat8', name: '8. Rigid Barriers', group: 'major' },
  { id: 'cat9', name: '9. Flexible Barriers', group: 'major' },
  { id: 'cat10', name: '10. Check Dams', group: 'major' },
  { id: 'cat11', name: '11. Piling Works', group: 'major' },
  { id: 'cat12', name: '12. Finished Slope Surfaces', group: 'major' },
  { id: 'cat13', name: '13. Drainage Measures & Maintenance Access', group: 'major' },
  { id: 'trial1', name: 'Site Trial 1: GFRP Soil Nail', group: 'trial' },
  { id: 'trial2', name: 'Site Trial 2: Skin Wall with GGBS Concrete', group: 'trial' }
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


const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [projectInfo, setProjectInfo] = useState(INITIAL_PROJECT_INFO);
  const [records, setRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  
  const [activeWorkCat, setActiveWorkCat] = useState('cat1');
  const [activeTab, setActiveTab] = useState('materials');
  const [selectedRecords, setSelectedRecords] = useState([]);

  const [notification, setNotification] = useState(null);
  const [user, setUser] = useState(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('entry'); // 'entry' | 'analysis' | 'forecasting'

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      document.head.appendChild(script);
    }

    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const projectInfoRef = doc(db, 'artifacts', appId, 'public', 'data', 'projectInfo', 'main');
    const unsubProjectInfo = onSnapshot(projectInfoRef, (docSnap) => {
      if (docSnap.exists()) {
        setProjectInfo(docSnap.data());
      }
    }, (error) => console.error("Error fetching project info:", error));

    const recordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'records');
    const unsubRecords = onSnapshot(recordsRef, (snapshot) => {
      const fetchedRecords = [];
      snapshot.forEach((d) => fetchedRecords.push(d.data()));
      setRecords(fetchedRecords.sort((a, b) => a.monthYear.localeCompare(b.monthYear)));
    }, (error) => console.error("Error fetching records:", error));

    return () => {
      unsubProjectInfo();
      unsubRecords();
    };
  }, [user]);

  const handleProjectInfoChange = (e) => {
    setProjectInfo({ ...projectInfo, [e.target.name]: e.target.value });
  };

  const syncProjectInfo = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projectInfo', 'main'), projectInfo);
      showNotification('Project details synced to cloud.');
    } catch (error) {
      console.error("Error syncing project info:", error);
    }
  };

  
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


  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const saveRecord = async () => {
    if (!formData.monthYear) {
      showNotification('Please enter a Month/Year for this record.');
      return;
    }
    
    if (!user) return;

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'records', formData.monthYear), formData);
      setIsModalOpen(false);
      setFormData(INITIAL_FORM_DATA);
      showNotification('Record saved to cloud successfully.');
    } catch (error) {
      console.error("Error saving record:", error);
      showNotification('Failed to save record.');
    }
  };

  
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

  
  const getAggregated = (record, field) => {
    if (!record.categories) return Number(record[field] || 0);
    return Object.values(record.categories).reduce((sum, cat) => sum + Number(cat[field] || 0), 0);
  };

  const deleteRecord = async (monthYear) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'records', monthYear));
      showNotification('Record deleted from cloud.');
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  
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


  const exportData = () => {
    const exportObject = {
      projectInformation: projectInfo,
      monthlyData: records
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Carbon_Inventory_${projectInfo.contractNo.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showNotification('Data exported successfully.');
  };

  const exportToExcel = () => {
    if (!window.XLSX) {
      showNotification('Excel library is still loading. Please try again in a few seconds.');
      return;
    }

    // Sheet 1: Project Information
    const wsInfoData = [
      ['General Project Information'],
      [],
      ['Agreement No.', 'CE 53/2022 (GE)'],
      ['Contract No.', projectInfo.contractNo],
      ['Man-made Feature No.', projectInfo.featureNo],
      ['Natural Hillside Catchment No.', projectInfo.catchmentNo],
      ['Site Address', projectInfo.siteAddress],
      ['Works Beginning', projectInfo.worksBeginning],
      ['Works Completion', projectInfo.worksCompletion]
    ];
    const wsInfo = window.XLSX.utils.aoa_to_sheet(wsInfoData);

    // Sheet 2: Monthly Data (Flattened for easy viewing)
    
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


    const wsData = window.XLSX.utils.json_to_sheet(formattedRecords);

    // Create workbook and append sheets
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, wsInfo, "Project Info");
    window.XLSX.utils.book_append_sheet(wb, wsData, "Monthly Data");

    // Trigger download
    window.XLSX.writeFile(wb, `Carbon_Inventory_${projectInfo.contractNo.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    showNotification('Excel data exported successfully.');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();

    if (fileExt === 'json') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          if (data.projectInformation) {
            setProjectInfo(data.projectInformation);
            if (user) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projectInfo', 'main'), data.projectInformation);
          }
          if (data.monthlyData && Array.isArray(data.monthlyData)) {
            if (user) {
              for (const rec of data.monthlyData) {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'records', rec.monthYear), rec);
              }
            }
          }
          showNotification('Complete backup imported successfully!');
        } catch (err) {
          console.error(err);
          showNotification('Error: Invalid JSON backup file.');
        }
      };
      reader.readAsText(file);
    } else if (['xlsx', 'xls', 'csv'].includes(fileExt)) {
      if (!window.XLSX) {
        showNotification('Excel parser is still loading. Please try again in a few seconds.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = window.XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          const newInfo = { ...projectInfo };
          
          for (let i = 0; i < Math.min(20, data.length); i++) {
            const row = data[i];
            if (!row || !row[0]) continue;
            
            const label = String(row[0]).trim().toLowerCase();
            const val = row[1] || row[2] || '';
            
            if (label.includes('contract no')) newInfo.contractNo = val;
            if (label.includes('feature no')) newInfo.featureNo = val;
            if (label.includes('catchment areas no') || label.includes('catchment no')) newInfo.catchmentNo = val;
            if (label.includes('site address')) newInfo.siteAddress = val;
            if (label.includes('works beginning')) newInfo.worksBeginning = val;
            if (label.includes('works completion')) newInfo.worksCompletion = val;
          }

          setProjectInfo(newInfo);
          if (user) {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projectInfo', 'main'), newInfo);
          }
          
          showNotification('Project details extracted from Excel! Monthly data requires JSON upload or manual entry.');
        } catch (error) {
          console.error(error);
          showNotification('Error reading Excel file.');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      showNotification('Unsupported file. Please upload .xls, .xlsx, .csv, or .json');
    }

    e.target.value = null;
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} showNotification={showNotification} notification={notification} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Navigation */}
      <nav className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-10 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Leaf className="h-8 w-8 text-emerald-300 drop-shadow-sm" />
            <div>
              <h1 className="text-xl font-bold flex items-center gap-3">
                LPMit Works Carbon Inventory
                {user && (
                  <div className="flex items-center gap-1.5 bg-emerald-800/60 px-2.5 py-1 rounded-full border border-emerald-500/30 shadow-inner">
                    <div className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-100 tracking-wider uppercase">Synced</span>
                  </div>
                )}
              </h1>
              <p className="text-emerald-200 text-xs">Agreement No. CE 53/2022 (GE)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button 
              onClick={() => setCurrentView('entry')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium border ${currentView === 'entry' ? 'bg-emerald-600 border-emerald-500 text-white shadow-inner' : 'bg-emerald-800/80 hover:bg-emerald-600 border-transparent text-emerald-100'}`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Data Entry
            </button>
            <button 
              onClick={() => setCurrentView('analysis')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium border ${currentView === 'analysis' ? 'bg-emerald-600 border-emerald-500 text-white shadow-inner' : 'bg-emerald-800/80 hover:bg-emerald-600 border-transparent text-emerald-100'}`}
            >
              <BarChart3 className="h-4 w-4" />
              Analysis
            </button>
            <button 
              onClick={() => setCurrentView('forecasting')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium border ${currentView === 'forecasting' ? 'bg-emerald-600 border-emerald-500 text-white shadow-inner border-r-4' : 'bg-emerald-800/80 hover:bg-emerald-600 border-transparent text-emerald-100'} mr-2`}
            >
              <Cpu className="h-4 w-4" />
              Forecasting (AS04)
            </button>
            
            <div className="w-px h-6 bg-emerald-600/50 mx-1 hidden sm:block"></div>
            
            <input 
              type="file" 
              accept=".json, .xlsx, .xls, .csv" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-2 bg-emerald-800/50 hover:bg-emerald-600 px-3 py-2 rounded-md transition-colors text-sm font-medium border border-emerald-600/50"
              title="Upload File"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-800/50 hover:bg-emerald-600 px-3 py-2 rounded-md transition-colors text-sm font-medium border border-emerald-600/50"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
            </button>
            <button 
              onClick={exportData}
              className="flex items-center gap-2 bg-emerald-800/50 hover:bg-emerald-600 px-3 py-2 rounded-md transition-colors text-sm font-medium border border-emerald-600/50"
              title="Export JSON Backup"
            >
              <Download className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setIsAuthenticated(false)}
              className="flex items-center gap-2 bg-red-500/90 hover:bg-red-500 px-3 py-2 rounded-md transition-colors text-sm font-medium border border-red-500/50 ml-1 shadow-sm"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 py-8 space-y-8">
        
        {notification && (
          <div className="fixed top-20 right-4 bg-slate-800 text-white px-6 py-3 rounded-md shadow-lg z-50 animate-fade-in flex items-center gap-2 border border-slate-700">
            <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></div>
            {notification}
          </div>
        )}

        {currentView === 'analysis' ? (
          <AnalysisDashboard records={records} />
        ) : currentView === 'forecasting' ? (
          <ForecastingDashboard />
        ) : (
          <>
            {/* Project Info Section */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                General Project Information
                <span className="text-xs font-normal text-slate-400 ml-auto bg-slate-100 px-2 py-1 rounded-md hidden sm:inline-block">Edits auto-save when you click away</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InputField label="Contract No." name="contractNo" value={projectInfo.contractNo} onChange={handleProjectInfoChange} onBlur={syncProjectInfo} />
                <InputField label="Man-made Feature No." name="featureNo" value={projectInfo.featureNo} onChange={handleProjectInfoChange} onBlur={syncProjectInfo} placeholder="e.g., 11NW-A/FR1" />
                <InputField label="Natural Hillside Catchment No." name="catchmentNo" value={projectInfo.catchmentNo} onChange={handleProjectInfoChange} onBlur={syncProjectInfo} />
                <InputField label="Site Address" name="siteAddress" value={projectInfo.siteAddress} onChange={handleProjectInfoChange} onBlur={syncProjectInfo} className="md:col-span-2 lg:col-span-3" />
                <InputField label="Works Beginning" name="worksBeginning" type="month" value={projectInfo.worksBeginning} onChange={handleProjectInfoChange} onBlur={syncProjectInfo} />
                <InputField label="Works Completion" name="worksCompletion" type="month" value={projectInfo.worksCompletion} onChange={handleProjectInfoChange} onBlur={syncProjectInfo} />
              </div>
            </section>

            {/* Monthly Records Section */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b pb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  Monthly Carbon Emission Data
                </h2>
                
                <div className="flex gap-2">
                  {selectedRecords.length > 0 && (
                    <button onClick={batchDelete} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm">
                      Delete Selected ({selectedRecords.length})
                    </button>
                  )}
                  <button 
                    onClick={() => { setFormData(INITIAL_FORM_DATA); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Monthly Record
                  </button>
                </div>
              </div>

              {records.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg">
                  <Leaf className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-slate-600 font-medium">No records added yet</h3>
                  <p className="text-slate-400 text-sm mt-1">Click the button above to add your first monthly carbon data.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      
                      <tr>
                        <th className="px-4 py-3 text-left w-10">
                          <input type="checkbox" checked={records.length > 0 && selectedRecords.length === records.length} onChange={toggleAllRecords} className="rounded text-emerald-600 focus:ring-emerald-500" />
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">Month</th>

                        <th className="px-6 py-3 text-left font-semibold">Total Concrete (m³)</th>
                        <th className="px-6 py-3 text-left font-semibold">Total Steel (kg)</th>
                        <th className="px-6 py-3 text-left font-semibold">Diesel & Biofuel (L)</th>
                        <th className="px-6 py-3 text-left font-semibold">Total Electricity (kWh)</th>
                        <th className="px-6 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {records.map((record) => (
                        
                        <tr key={record.monthYear} className={`transition-colors ${selectedRecords.includes(record.monthYear) ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <td className="px-4 py-4">
                            <input type="checkbox" checked={selectedRecords.includes(record.monthYear)} onChange={() => toggleRecordSelect(record.monthYear)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">{record.monthYear}</td>

                          <td className="px-6 py-4">
                            
                            {(getAggregated(record, 'massConcrete') + getAggregated(record, 'reinforcedConcrete') + getAggregated(record, 'namiConcrete') + getAggregated(record, 'noFineConcrete')).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            {(getAggregated(record, 'soilNailSteel') + getAggregated(record, 'steelRebar')).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">{(getAggregated(record, 'diesel') + getAggregated(record, 'biofuel')).toFixed(2)}</td>
                          <td className="px-6 py-4">{(getAggregated(record, 'electricity') + getAggregated(record, 'bessElectricity') + getAggregated(record, 'evElectricity')).toFixed(2)}</td>

                          <td className="px-6 py-4 text-right">
                            <button onClick={() => editRecord(record)} className="text-blue-600 hover:text-blue-800 font-medium mr-4">Edit</button>
                            <button onClick={() => deleteRecord(record.monthYear)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Expanded Data Entry Modal */}
      {isModalOpen && currentView === 'entry' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
            
            {/* Modal Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-800">
                {formData.monthYear ? `Edit Record: ${formData.monthYear}` : 'New Monthly Record'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-200/50 rounded hover:bg-slate-200 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-0 sm:flex">
              
              
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


                {activeTab === 'materials' && (
                  <div className="space-y-8 animate-fade-in">
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Soil Nails</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Solid Steel Bar Weight (kg)" name="soilNailSteel" type="number" value={(formData.categories?.[activeWorkCat] || {}).soilNailSteel} onChange={handleFormChange} />
                        <InputField label="Cement Grout Weight (kg)" name="soilNailGrout" type="number" value={(formData.categories?.[activeWorkCat] || {}).soilNailGrout} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Concrete & Cementitious Materials</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Mass Concrete Backfilling (m³)" name="massConcrete" type="number" value={(formData.categories?.[activeWorkCat] || {}).massConcrete} onChange={handleFormChange} />
                        <InputField label="Nami Self-Compacting Material Backfilling (m³)" name="namiConcrete" type="number" value={(formData.categories?.[activeWorkCat] || {}).namiConcrete} onChange={handleFormChange} />
                        <InputField label="No-fine Concrete (m³)" name="noFineConcrete" type="number" value={(formData.categories?.[activeWorkCat] || {}).noFineConcrete} onChange={handleFormChange} />
                        <InputField label="Cement Grout Backfilling (m³/kg)" name="cementGroutBackfill" type="number" value={(formData.categories?.[activeWorkCat] || {}).cementGroutBackfill} onChange={handleFormChange} />
                        <InputField label="Reinforced Concrete (m³)" name="reinforcedConcrete" type="number" value={(formData.categories?.[activeWorkCat] || {}).reinforcedConcrete} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Steel & Rebar</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Steel Rebar Weight (kg)" name="steelRebar" type="number" value={(formData.categories?.[activeWorkCat] || {}).steelRebar} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Earthworks</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Recompacting Existing Excavated Soil (m³)" name="recompactingSoil" type="number" value={(formData.categories?.[activeWorkCat] || {}).recompactingSoil} onChange={handleFormChange} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'operations' && (
                  <div className="space-y-8 animate-fade-in">
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Fuel Consumptions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Diesel Fuel (Litre)" name="diesel" type="number" value={(formData.categories?.[activeWorkCat] || {}).diesel} onChange={handleFormChange} />
                        <InputField label="Biofuel - B10 or higher (Litre)" name="biofuel" type="number" value={(formData.categories?.[activeWorkCat] || {}).biofuel} onChange={handleFormChange} />
                        <InputField label="Grade of Biofuel (Specify)" name="biofuelGrade" type="text" value={(formData.categories?.[activeWorkCat] || {}).biofuelGrade} onChange={handleFormChange} placeholder="e.g. B100" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Electricity Consumptions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Grid Electricity (kWh)" name="electricity" type="number" value={(formData.categories?.[activeWorkCat] || {}).electricity} onChange={handleFormChange} />
                        <InputField label="Electricity via BESS (kWh)" name="bessElectricity" type="number" value={(formData.categories?.[activeWorkCat] || {}).bessElectricity} onChange={handleFormChange} />
                        
                      </div>
                    </div>
                  </div>
                )}

                
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

                {activeTab === 'transport' && (
                  <div className="space-y-8 animate-fade-in">
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Waste Disposal (Stream 1)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Total no. of trips" name="waste1Trips" type="number" value={(formData.categories?.[activeWorkCat] || {}).waste1Trips} onChange={handleFormChange} />
                        <InputField label="Location of disposal" name="waste1Location" type="text" value={(formData.categories?.[activeWorkCat] || {}).waste1Location} onChange={handleFormChange} />
                        <InputField label="Travel distance to site (km)" name="waste1Distance" type="number" value={(formData.categories?.[activeWorkCat] || {}).waste1Distance} onChange={handleFormChange} />
                        <InputField label="Total weight (kg)" name="waste1Weight" type="number" value={(formData.categories?.[activeWorkCat] || {}).waste1Weight} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Waste Disposal (Stream 2)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Total no. of trips" name="waste2Trips" type="number" value={(formData.categories?.[activeWorkCat] || {}).waste2Trips} onChange={handleFormChange} />
                        <InputField label="Location of disposal" name="waste2Location" type="text" value={(formData.categories?.[activeWorkCat] || {}).waste2Location} onChange={handleFormChange} />
                        <InputField label="Travel distance to site (km)" name="waste2Distance" type="number" value={(formData.categories?.[activeWorkCat] || {}).waste2Distance} onChange={handleFormChange} />
                        <InputField label="Total weight (kg)" name="waste2Weight" type="number" value={(formData.categories?.[activeWorkCat] || {}).waste2Weight} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Contract Vehicles</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="No. of Non-Electric Contract Cars" name="contractCarsNonElectric" type="number" value={(formData.categories?.[activeWorkCat] || {}).contractCarsNonElectric} onChange={handleFormChange} />
                        <InputField label="Consumption of Petrol (Litre)" name="petrol" type="number" value={(formData.categories?.[activeWorkCat] || {}).petrol} onChange={handleFormChange} />
                        <InputField label="No. of Electric Contract Cars" name="contractCarsElectric" type="number" value={(formData.categories?.[activeWorkCat] || {}).contractCarsElectric} onChange={handleFormChange} />
                        <InputField label="Electric Consumption (kWh)" name="evElectricity" type="number" value={(formData.categories?.[activeWorkCat] || {}).evElectricity} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Site Personnel</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Average no. of labour on site per day" name="labourCount" type="number" value={(formData.categories?.[activeWorkCat] || {}).labourCount} onChange={handleFormChange} />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={saveRecord}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md transition-colors font-medium text-sm shadow-sm"
              >
                <Save className="h-4 w-4" />
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for minor animations & range styling */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          margin-top: -6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: #e2e8f0;
          border-radius: 2px;
        }
      `}} />
    </div>
  );
}

// Sub-components
function LoginScreen({ onLogin, showNotification, notification }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const hashString = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userHash = await hashString(username);
      const passHash = await hashString(password);
      if (
        userHash === '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' && 
        passHash === 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
      ) { onLogin(); } else { showNotification('Invalid username or password'); }
    } catch (error) { showNotification('Login error occurred'); }
    setIsLoading(false);
  };

  const features = [
    { icon: <HardHat className="h-6 w-6" />, title: '13 Work Categories', desc: 'Track materials across Soil Nails, Retaining Walls, Barriers, and more' },
    { icon: <BarChart3 className="h-6 w-6" />, title: 'Real-time Analysis', desc: 'Per-category breakdowns, site trial reports, and energy source analysis' },
    { icon: <Zap className="h-6 w-6" />, title: 'Energy Tracking', desc: 'Diesel, Petrol, Biofuel, Grid/BESS/EV electricity monitoring' },
    { icon: <Cpu className="h-6 w-6" />, title: 'AI Forecasting', desc: 'Predict carbon targets with multi-parameter correlation engine' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
      </div>

      {notification && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl z-50 animate-fade-in border border-red-500">{notification}</div>
      )}

      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30"><Leaf className="h-7 w-7 text-emerald-400" /></div>
            <div>
              <h1 className="text-lg font-bold text-white">LPMit Carbon Inventory</h1>
              <p className="text-xs text-emerald-300/70 font-medium">CE 53/2022 (GE) — Slope Works</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-900/50 px-3 py-1.5 rounded-full border border-emerald-700/40 text-xs text-slate-400">
            <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></div>System Online
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          <div className="lg:col-span-3 space-y-10">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500/20 mb-6">
                <Activity className="h-3.5 w-3.5" /> Works Carbon Emission Portal
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1] mb-5">
                Carbon Emission<br/><span className="gradient-text">Tracking & Analysis</span>
              </h2>
              <p className="text-slate-400 text-base leading-relaxed max-w-lg">
                Monitor, analyse, and forecast carbon emissions across 13 major work categories 
                and 2 site trials. Real-time cloud sync with comprehensive resource breakdowns.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up" style={{animationDelay: '0.15s'}}>
              {features.map((f, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-emerald-500/30 transition-all group">
                  <div className="text-emerald-400 mb-3 group-hover:scale-110 transition-transform">{f.icon}</div>
                  <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-2"><div className="h-2 w-2 bg-emerald-500 rounded-full"></div>Firebase Synced</div>
              <div className="flex items-center gap-2"><div className="h-2 w-2 bg-blue-500 rounded-full"></div>Excel Import/Export</div>
              <div className="flex items-center gap-2"><div className="h-2 w-2 bg-amber-500 rounded-full"></div>15 Work Categories</div>
            </div>
          </div>

          <div className="lg:col-span-2 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/20">
              <div className="text-center mb-7">
                <div className="inline-flex bg-emerald-500/15 p-3.5 rounded-2xl border border-emerald-500/20 mb-4"><Lock className="h-6 w-6 text-emerald-400" /></div>
                <h3 className="text-xl font-bold text-white">Sign In</h3>
                <p className="text-sm text-slate-400 mt-1">Access the portal dashboard</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                      placeholder="Enter username" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                      placeholder="••••••••" required />
                  </div>
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/30 transition-all text-sm disabled:opacity-50">
                  {isLoading ? 'Authenticating...' : 'Sign In to Portal'}
                </button>
              </form>
              <div className="mt-6 pt-5 border-t border-white/5 text-center">
                <p className="text-[11px] text-slate-500">Landslip Prevention & Mitigation Programme</p>
                <p className="text-[11px] text-slate-600 mt-1">AECOM Asia Company Limited</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <p>© 2026 Carbon Inventory Portal — CE 53/2022 (GE)</p>
          <p>Built for Geotechnical Engineering Office</p>
        </div>
      </footer>
    </div>
  );
}

function AnalysisDashboard({ records }) {
  const [analysisView, setAnalysisView] = useState('overview');

  // Helper: aggregate a specific field across all categories for a record
  const getRecordAgg = (record, field) => {
    if (!record.categories) return Number(record[field] || 0);
    return Object.values(record.categories).reduce((s, c) => s + Number(c[field] || 0), 0);
  };

  // Helper: aggregate a field for a specific category across all records
  const getCatTotal = (catId, field) => {
    return records.reduce((sum, r) => {
      if (!r.categories || !r.categories[catId]) return sum;
      return sum + Number(r.categories[catId][field] || 0);
    }, 0);
  };

  // Grand totals across all records and categories
  const grandTotals = records.reduce((acc, r) => {
    const cats = r.categories ? Object.values(r.categories) : [r];
    cats.forEach(c => {
      acc.concrete += Number(c.massConcrete || 0) + Number(c.reinforcedConcrete || 0) + Number(c.namiConcrete || 0) + Number(c.noFineConcrete || 0);
      acc.cement += Number(c.soilNailGrout || 0) + Number(c.cementGroutBackfill || 0);
      acc.steel += Number(c.soilNailSteel || 0) + Number(c.steelRebar || 0);
      acc.diesel += Number(c.diesel || 0);
      acc.petrol += Number(c.petrol || 0);
      acc.biofuel += Number(c.biofuel || 0);
      acc.electricity += Number(c.electricity || 0);
      acc.bessElectricity += Number(c.bessElectricity || 0);
      acc.evElectricity += Number(c.evElectricity || 0);
      acc.water += Number(c.water || 0);
    });
    return acc;
  }, { concrete: 0, cement: 0, steel: 0, diesel: 0, petrol: 0, biofuel: 0, electricity: 0, bessElectricity: 0, evElectricity: 0, water: 0 });

  const materialFields = [
    { key: 'massConcrete', label: 'Mass Concrete', unit: 'm³' },
    { key: 'reinforcedConcrete', label: 'Reinforced Concrete', unit: 'm³' },
    { key: 'namiConcrete', label: 'Nami Concrete', unit: 'm³' },
    { key: 'noFineConcrete', label: 'No-fine Concrete', unit: 'm³' },
    { key: 'soilNailSteel', label: 'Solid Steel Bar', unit: 'kg' },
    { key: 'steelRebar', label: 'Steel Rebar', unit: 'kg' },
    { key: 'soilNailGrout', label: 'Cement Grout', unit: 'kg' },
    { key: 'cementGroutBackfill', label: 'Cement Grout Backfill', unit: 'm³/kg' },
    { key: 'recompactingSoil', label: 'Recompacting Soil', unit: 'm³' },
  ];

  const majorCats = WORK_CATEGORIES.filter(c => c.group === 'major');
  const trialCats = WORK_CATEGORIES.filter(c => c.group === 'trial');

  const tabs = [
    { id: 'overview', label: 'Grand Totals', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'byCategory', label: 'By Work Category', icon: <HardHat className="h-4 w-4" /> },
    { id: 'siteTrials', label: 'Site Trials', icon: <Calculator className="h-4 w-4" /> },
    { id: 'energy', label: 'Energy Breakdown', icon: <Zap className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Analysis Tab Bar */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setAnalysisView(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${analysisView === t.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* 3.6 — Grand Totals (whole site combined same materials) */}
      {analysisView === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-3 border-b">
              <BarChart3 className="h-5 w-5 text-emerald-600" /> Whole Site — Total Material & Energy Usage
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <AnalysisCard label="Total Concrete" value={grandTotals.concrete} unit="m³" color="blue" />
              <AnalysisCard label="Total Cement/Grout" value={grandTotals.cement} unit="kg" color="amber" />
              <AnalysisCard label="Total Steel & Rebar" value={grandTotals.steel} unit="kg" color="slate" />
              <AnalysisCard label="Grid Electricity" value={grandTotals.electricity} unit="kWh" color="yellow" />
              <AnalysisCard label="BESS Electricity" value={grandTotals.bessElectricity} unit="kWh" color="teal" />
              <AnalysisCard label="Diesel Fuel" value={grandTotals.diesel} unit="L" color="orange" />
              <AnalysisCard label="Petrol" value={grandTotals.petrol} unit="L" color="red" />
              <AnalysisCard label="Biofuel (B10+)" value={grandTotals.biofuel} unit="L" color="green" />
              <AnalysisCard label="EV Electricity" value={grandTotals.evElectricity} unit="kWh" color="indigo" />
              <AnalysisCard label="Fresh Water" value={grandTotals.water} unit="L" color="cyan" />
            </div>
          </div>
        </div>
      )}

      {/* 3.1 — Accumulated material usage per work type */}
      {analysisView === 'byCategory' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b bg-slate-50"><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><HardHat className="h-5 w-5 text-emerald-600" />Accumulated Material Usage — 13 Major Works</h2></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-slate-50 z-10">Work Category</th>
                    {materialFields.map(f => <th key={f.key} className="px-3 py-3 text-right font-semibold whitespace-nowrap">{f.label} ({f.unit})</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {majorCats.map(cat => (
                    <tr key={cat.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 sticky left-0 bg-white whitespace-nowrap">{cat.name}</td>
                      {materialFields.map(f => <td key={f.key} className="px-3 py-3 text-right font-mono text-slate-600">{getCatTotal(cat.id, f.key).toFixed(1)}</td>)}
                    </tr>
                  ))}
                  <tr className="bg-emerald-50 font-bold">
                    <td className="px-4 py-3 text-emerald-800 sticky left-0 bg-emerald-50">TOTAL</td>
                    {materialFields.map(f => <td key={f.key} className="px-3 py-3 text-right font-mono text-emerald-800">{majorCats.reduce((s, cat) => s + getCatTotal(cat.id, f.key), 0).toFixed(1)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3.2 — Accumulated material usage for site trials */}
      {analysisView === 'siteTrials' && (
        <div className="space-y-4 animate-fade-in">
          {trialCats.map(trial => (
            <div key={trial.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b bg-gradient-to-r from-indigo-50 to-white">
                <h3 className="text-lg font-bold text-slate-800">{trial.name}</h3>
              </div>
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {materialFields.map(f => {
                  const val = getCatTotal(trial.id, f.key);
                  return val > 0 ? <AnalysisCard key={f.key} label={f.label} value={val} unit={f.unit} color="indigo" /> : null;
                })}
                <AnalysisCard label="Diesel" value={getCatTotal(trial.id, 'diesel')} unit="L" color="orange" />
                <AnalysisCard label="Biofuel (B10+)" value={getCatTotal(trial.id, 'biofuel')} unit="L" color="green" />
                <AnalysisCard label="BESS Electricity" value={getCatTotal(trial.id, 'bessElectricity')} unit="kWh" color="teal" />
                <AnalysisCard label="Grid Electricity" value={getCatTotal(trial.id, 'electricity')} unit="kWh" color="yellow" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3.3/3.4/3.5 — Energy breakdown */}
      {analysisView === 'energy' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 pb-3 border-b"><Zap className="h-5 w-5 text-amber-500" />Construction Energy Sources</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AnalysisCard label="Diesel Fuel" value={grandTotals.diesel} unit="L" color="orange" />
              <AnalysisCard label="Petrol Fuel" value={grandTotals.petrol} unit="L" color="red" />
              <AnalysisCard label="Biofuel (B5/B10+)" value={grandTotals.biofuel} unit="L" color="green" />
              <AnalysisCard label="Grid Electricity" value={grandTotals.electricity} unit="kWh" color="yellow" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 pb-3 border-b"><Truck className="h-5 w-5 text-blue-500" />Transportation Energy Sources</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <AnalysisCard label="Petrol (Contract Cars)" value={grandTotals.petrol} unit="L" color="red" />
              <AnalysisCard label="EV Electricity" value={grandTotals.evElectricity} unit="kWh" color="indigo" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 pb-3 border-b"><TrendingUp className="h-5 w-5 text-teal-500" />Site Trial Energy Sources</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trialCats.map(t => (
                <React.Fragment key={t.id}>
                  <AnalysisCard label={`${t.name.split(':')[1]?.trim() || t.name} — Biofuel`} value={getCatTotal(t.id, 'biofuel')} unit="L" color="green" />
                  <AnalysisCard label={`${t.name.split(':')[1]?.trim() || t.name} — BESS`} value={getCatTotal(t.id, 'bessElectricity')} unit="kWh" color="teal" />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ label, value, unit, color = 'slate' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  return (
    <div className={`p-4 rounded-lg border ${colorMap[color] || colorMap.slate} card-hover`}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-75">{label}</div>
      <div className="text-xl font-bold flex items-baseline gap-1">
        {(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
        <span className="text-xs font-medium opacity-60">{unit}</span>
      </div>
    </div>
  );
}

function InputField({ label, name, type = "text", value, onChange, onBlur, placeholder, className = "", required = false }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className="px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-sm w-full"
      />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap sm:whitespace-normal text-left
        ${active 
          ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' 
          : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700 border border-transparent'
        }
      `}
    >
      {React.cloneElement(icon, { className: `h-5 w-5 ${active ? 'text-emerald-600' : 'text-slate-400'}` })}
      {label}
    </button>
  );
}

function ForecastingDashboard() {
  const [budget, setBudget] = useState(120); 
  const [duration, setDuration] = useState(24); 
  const [complexity, setComplexity] = useState(1.1); 
  
  const [measures, setMeasures] = useState({
    bess: 10,
    biofuel: 20,
    lowCarbonConcrete: 50,
    electricVehicles: 0,
    recycledSteel: 30
  });

  const handleSlider = (key, value) => {
    setMeasures(prev => ({ ...prev, [key]: Number(value) }));
  };

  const durationFactor = 1 + ((duration - 24) * 0.005); 
  const baselineIntensity = 14.5 * complexity * durationFactor;
  const baselineEmissions = budget * baselineIntensity;

  const rBess = (measures.bess / 100) * 8.5; 
  const rBio = (measures.biofuel / 100) * 5.2; 
  const rConcrete = (measures.lowCarbonConcrete / 100) * 15.0; 
  const rEV = (measures.electricVehicles / 100) * 3.3; 
  const rSteel = (measures.recycledSteel / 100) * 6.5; 

  const reductionPercentage = rBess + rBio + rConcrete + rEV + rSteel;
  const reductionAmount = baselineEmissions * (reductionPercentage / 100);
  
  const forecastedEmissions = baselineEmissions - reductionAmount; 

  const dataPoints = 14500 + Math.floor(Math.random() * 100);
  const confidence = Math.max(85, 98 - (budget / 50) - Math.abs(complexity - 1) * 10).toFixed(1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Cpu className="h-6 w-6 text-indigo-600" />
              AI Prediction Model & Forecasting (AS04)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Multi-parameter correlation engine establishing carbon emission targets.
            </p>
          </div>
          
          <div className="flex gap-4 items-center bg-slate-900 rounded-lg p-3 border border-slate-700 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                <Activity className="h-3 w-3 text-indigo-400" /> Model Confidence
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400 leading-none mt-1">{confidence}%</span>
            </div>
            <div className="w-px h-8 bg-slate-700"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Trained Epochs</span>
              <span className="text-lg font-mono text-slate-200 leading-none mt-1">{dataPoints}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4 space-y-6 bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Settings2 className="h-5 w-5 text-slate-500" />
              1. Base Parameters (Scope 2.4)
            </h3>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">Annual Budget</label>
                  <span className="text-sm font-bold text-slate-900">HK$ {budget}M</span>
                </div>
                <input 
                  type="range" min="10" max="500" step="5" value={budget} onChange={(e) => setBudget(e.target.value)}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">Duration</label>
                  <span className="text-sm font-bold text-slate-900">{duration} Months</span>
                </div>
                <input 
                  type="range" min="6" max="60" step="1" value={duration} onChange={(e) => setDuration(e.target.value)}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Primary Works Complexity</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setComplexity(0.85)} className={`py-2 text-xs font-medium rounded border transition-colors ${complexity === 0.85 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>Simple</button>
                  <button onClick={() => setComplexity(1.1)} className={`py-2 text-xs font-medium rounded border transition-colors ${complexity === 1.1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>Standard</button>
                  <button onClick={() => setComplexity(1.4)} className={`py-2 text-xs font-medium rounded border transition-colors ${complexity === 1.4 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>Complex (RW)</button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-tight">Adjusts the baseline intensity correlation multiplier based on geotechnical feature types.</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200 mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Predicted Baseline</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {baselineEmissions.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm font-normal text-slate-500">tCO₂e</span>
              </p>
            </div>
          </div>

          <div className="xl:col-span-5 space-y-6">
            <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Sliders className="h-5 w-5 text-emerald-600" />
              2. Decarbonisation Measures (Scope 2.6)
            </h3>
            
            <div className="space-y-5 px-1">
              <RangeRow 
                label="BESS Site Energy Adoption" desc="Replaces diesel generators" 
                value={measures.bess} maxReduction={8.5} currentReduction={rBess} onChange={(v) => handleSlider('bess', v)} 
              />
              <RangeRow 
                label="Biofuel Usage (B100 Blend)" desc="Plant & equipment fuel swap" 
                value={measures.biofuel} maxReduction={5.2} currentReduction={rBio} onChange={(v) => handleSlider('biofuel', v)} 
              />
              <RangeRow 
                label="Low-Carbon Concrete (GGBS/PFA)" desc="Cementitious material substitution" 
                value={measures.lowCarbonConcrete} maxReduction={15.0} currentReduction={rConcrete} onChange={(v) => handleSlider('lowCarbonConcrete', v)} 
              />
              <RangeRow 
                label="Recycled Steel Rebar" desc="Sourcing from electric arc furnace" 
                value={measures.recycledSteel} maxReduction={6.5} currentReduction={rSteel} onChange={(v) => handleSlider('recycledSteel', v)} 
              />
              <RangeRow 
                label="Electric Vehicle Fleet" desc="Contract cars & light transport" 
                value={measures.electricVehicles} maxReduction={3.3} currentReduction={rEV} onChange={(v) => handleSlider('electricVehicles', v)} 
              />
            </div>
          </div>

          <div className="xl:col-span-3 space-y-6">
            <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Target className="h-5 w-5 text-emerald-600" />
              3. Target Formulated
            </h3>
            
            <div className="bg-emerald-900 p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -top-6 opacity-10">
                <Target className="h-32 w-32" />
              </div>
              
              <div className="relative z-10">
                <p className="text-sm text-emerald-200 font-medium mb-1 uppercase tracking-wider">Forecasted Target</p>
                <div className="flex items-end gap-1 border-b border-emerald-700/50 pb-4 mb-4">
                  <p className="text-4xl font-bold text-white tracking-tight leading-none">
                    {forecastedEmissions.toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </p>
                  <span className="text-sm font-medium text-emerald-300 mb-1">tCO₂e</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-emerald-400 mb-1">Reduction Percentage</p>
                    <p className="text-2xl font-bold text-emerald-100">-{reductionPercentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-400 mb-1">Total Carbon Avoided</p>
                    <p className="text-xl font-bold text-emerald-100">-{reductionAmount.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-xs font-normal">tCO₂e</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Target Aggressiveness</span>
                <span className="text-xs font-bold text-slate-700">{reductionPercentage > 25 ? 'High' : reductionPercentage > 10 ? 'Medium' : 'Low'}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex">
                <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(reductionPercentage * 2.5, 100)}%` }}></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function RangeRow({ label, desc, value, maxReduction, currentReduction, onChange }) {
  return (
    <div className="bg-white p-3 rounded border border-slate-100 shadow-sm hover:border-emerald-200 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-[10px] text-slate-500">{desc}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">-{currentReduction.toFixed(1)}%</p>
          <p className="text-[9px] text-slate-400 mt-1">Max: {maxReduction}%</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-slate-400 w-8">0%</span>
        <input 
          type="range" min="0" max="100" step="5" value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <span className="text-xs font-bold text-emerald-700 w-10 text-right">{value}%</span>
      </div>
    </div>
  );
}
