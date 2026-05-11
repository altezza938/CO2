import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
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

const INITIAL_FORM_DATA = {
  monthYear: '',
  // Materials
  soilNailSteel: '',
  soilNailGrout: '',
  massConcrete: '',
  reinforcedConcrete: '',
  steelRebar: '',
  // Site Operations
  diesel: '',
  biofuel: '',
  electricity: '',
  water: '',
  // Waste & Transport
  wasteWeight: '',
  wasteDistance: '',
  petrol: '',
  labourCount: ''
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
  const [activeTab, setActiveTab] = useState('materials');
  const [notification, setNotification] = useState(null);
  const [user, setUser] = useState(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('entry'); // 'entry' | 'analysis' | 'forecasting'

  const fileInputRef = useRef(null);

  useEffect(() => {
    // Dynamically load SheetJS for reading Excel files
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      document.head.appendChild(script);
    }

    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      signInWithCustomToken(auth, __initial_auth_token).catch(e => console.error("Auth error:", e));
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    try {
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
    } catch (error) {
      console.error("Firestore setup error:", error);
    }
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    setFormData(record);
    setIsModalOpen(true);
  };

  const exportData = () => {
    const exportObject = {
      projectInformation: projectInfo,
      monthlyData: records
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `Carbon_Inventory_${projectInfo.contractNo.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showNotification('JSON backup exported successfully.');
  };

  const exportDataXLS = () => {
    if (!window.XLSX) {
      showNotification('Excel library is still loading. Please try again.');
      return;
    }
    
    const wb = window.XLSX.utils.book_new();
    
    // Project Info Sheet
    const wsProject = window.XLSX.utils.json_to_sheet([projectInfo]);
    window.XLSX.utils.book_append_sheet(wb, wsProject, "Project Info");
    
    // Records Sheet
    const wsRecords = window.XLSX.utils.json_to_sheet(records);
    window.XLSX.utils.book_append_sheet(wb, wsRecords, "Monthly Data");
    
    // Save
    window.XLSX.writeFile(wb, `Carbon_Inventory_${projectInfo.contractNo.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    showNotification('Data exported as Excel successfully.');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();

    // 1. Handle JSON Backup Uploads
    if (fileExt === 'json') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          
          if (data.projectInformation) {
            setProjectInfo(data.projectInformation);
            if (user) {
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projectInfo', 'main'), data.projectInformation);
            }
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
    } 
    // 2. Handle Raw Excel/CSV Uploads (Extracts Project Info headers)
    else if (['xlsx', 'xls', 'csv'].includes(fileExt)) {
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
          
          // Scan first 20 rows to extract standard project info based on the provided XLS layout
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

    // Reset input
    e.target.value = null;
  };

  if (!isAuthenticated) {
    return <LoginScreen showNotification={showNotification} notification={notification} />;
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
            
            {/* Hidden file input for import */}
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
              onClick={exportData}
              className="flex items-center gap-2 bg-emerald-800/50 hover:bg-emerald-600 px-3 py-2 rounded-md transition-colors text-sm font-medium border border-emerald-600/50"
              title="Export JSON Backup"
            >
              <Download className="h-4 w-4" /> JSON
            </button>
            <button 
              onClick={exportDataXLS}
              className="flex items-center gap-2 bg-emerald-800/50 hover:bg-emerald-600 px-3 py-2 rounded-md transition-colors text-sm font-medium border border-emerald-600/50"
              title="Export as Excel"
            >
              <Download className="h-4 w-4" /> XLS
            </button>
            <button 
              onClick={() => signOut(auth)}
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
        
        {/* Notification Toast */}
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
                <button 
                  onClick={() => { setFormData(INITIAL_FORM_DATA); setIsModalOpen(true); }}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Monthly Record
                </button>
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
                        <th className="px-6 py-3 text-left font-semibold">Month</th>
                        <th className="px-6 py-3 text-left font-semibold">Concrete (m³)</th>
                        <th className="px-6 py-3 text-left font-semibold">Steel/Rebar (kg)</th>
                        <th className="px-6 py-3 text-left font-semibold">Diesel (L)</th>
                        <th className="px-6 py-3 text-left font-semibold">Electricity (kWh)</th>
                        <th className="px-6 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {records.map((record) => (
                        <tr key={record.monthYear} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{record.monthYear}</td>
                          <td className="px-6 py-4">
                            {(Number(record.massConcrete || 0) + Number(record.reinforcedConcrete || 0)).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            {(Number(record.soilNailSteel || 0) + Number(record.steelRebar || 0)).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">{record.diesel || '-'}</td>
                          <td className="px-6 py-4">{record.electricity || '-'}</td>
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

      {/* Data Entry Modal */}
      {isModalOpen && currentView === 'entry' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
            
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
              <div className="w-full sm:w-64 bg-slate-50 border-r border-slate-200 flex flex-row sm:flex-col p-2 sm:p-4 gap-2 overflow-x-auto sm:overflow-visible">
                <TabButton active={activeTab === 'materials'} onClick={() => setActiveTab('materials')} icon={<HardHat />} label="Materials" />
                <TabButton active={activeTab === 'operations'} onClick={() => setActiveTab('operations')} icon={<Zap />} label="Energy & Utilities" />
                <TabButton active={activeTab === 'transport'} onClick={() => setActiveTab('transport')} icon={<Truck />} label="Waste & Transport" />
              </div>

              {/* Form Content */}
              <div className="flex-1 p-6 bg-white">
                
                <div className="mb-8 max-w-sm">
                  <InputField label="Record Month / Year *" name="monthYear" type="month" value={formData.monthYear} onChange={handleFormChange} required />
                </div>

                {activeTab === 'materials' && (
                  <div className="space-y-8 animate-fade-in">
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Soil Nails & Ground Investigation</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Solid Steel Bar Weight (kg)" name="soilNailSteel" type="number" value={formData.soilNailSteel} onChange={handleFormChange} />
                        <InputField label="Cement Grout Weight (kg)" name="soilNailGrout" type="number" value={formData.soilNailGrout} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Concrete & Rebar</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Mass Concrete (m³)" name="massConcrete" type="number" value={formData.massConcrete} onChange={handleFormChange} />
                        <InputField label="Reinforced Concrete (m³)" name="reinforcedConcrete" type="number" value={formData.reinforcedConcrete} onChange={handleFormChange} />
                        <InputField label="Steel Rebar Weight (kg)" name="steelRebar" type="number" value={formData.steelRebar} onChange={handleFormChange} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'operations' && (
                  <div className="space-y-8 animate-fade-in">
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Site Operation Consumptions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Diesel Fuel (Litre)" name="diesel" type="number" value={formData.diesel} onChange={handleFormChange} />
                        <InputField label="Biofuel - B10 or higher (Litre)" name="biofuel" type="number" value={formData.biofuel} onChange={handleFormChange} />
                        <InputField label="Grid Electricity (kWh)" name="electricity" type="number" value={formData.electricity} onChange={handleFormChange} />
                        <InputField label="Fresh Water (Litre)" name="water" type="number" value={formData.water} onChange={handleFormChange} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'transport' && (
                  <div className="space-y-8 animate-fade-in">
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Waste Disposal</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Total Waste Weight (kg)" name="wasteWeight" type="number" value={formData.wasteWeight} onChange={handleFormChange} />
                        <InputField label="Average Distance to Disposal (km)" name="wasteDistance" type="number" value={formData.wasteDistance} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-slate-700 mb-4 border-b pb-2">Transportation & Personnel</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Contract Cars Petrol (Litre)" name="petrol" type="number" value={formData.petrol} onChange={handleFormChange} />
                        <InputField label="Average Labour on Site per Day" name="labourCount" type="number" value={formData.labourCount} onChange={handleFormChange} />
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
function LoginScreen({ showNotification, notification }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      showNotification('Invalid email or password');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      {notification && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-md shadow-lg z-50 animate-fade-in border border-red-700">
          {notification}
        </div>
      )}
      <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-2xl border border-slate-200">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-emerald-100 p-4 rounded-full mb-4 shadow-inner">
            <Leaf className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Carbon Inventory Login</h1>
          <p className="text-slate-500 text-sm mt-2">Sign in to access project data</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-slate-50"
                placeholder="Enter email"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-slate-50"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors mt-2"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AnalysisDashboard({ records }) {
  const totals = records.reduce((acc, curr) => {
    acc.concrete += Number(curr.massConcrete || 0) + Number(curr.reinforcedConcrete || 0);
    acc.steel += Number(curr.soilNailSteel || 0) + Number(curr.steelRebar || 0);
    acc.electricity += Number(curr.electricity || 0);
    acc.diesel += Number(curr.diesel || 0);
    acc.petrol += Number(curr.petrol || 0);
    return acc;
  }, { concrete: 0, steel: 0, electricity: 0, diesel: 0, petrol: 0 });

  const maxConcrete = Math.max(...records.map(r => Number(r.massConcrete || 0) + Number(r.reinforcedConcrete || 0)), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
          <BarChart3 className="h-6 w-6 text-emerald-600" />
          Project Resource Analysis
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Concrete" value={totals.concrete.toFixed(2)} unit="m³" color="bg-blue-50 text-blue-700 border-blue-200" />
          <StatCard title="Total Steel & Rebar" value={totals.steel.toFixed(2)} unit="kg" color="bg-slate-50 text-slate-700 border-slate-200" />
          <StatCard title="Total Fuel (Diesel+Petrol)" value={(totals.diesel + totals.petrol).toFixed(2)} unit="Litres" color="bg-orange-50 text-orange-700 border-orange-200" />
          <StatCard title="Total Electricity" value={totals.electricity.toFixed(2)} unit="kWh" color="bg-yellow-50 text-yellow-700 border-yellow-200" />
        </div>

        <h3 className="text-lg font-semibold text-slate-700 mb-4">Concrete Usage Trend</h3>
        {records.length > 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 pt-10 flex items-end gap-2 h-64 overflow-x-auto">
            {records.map((record) => {
              const val = Number(record.massConcrete || 0) + Number(record.reinforcedConcrete || 0);
              const heightPercent = Math.max((val / maxConcrete) * 100, 5);
              return (
                <div key={record.monthYear} className="flex flex-col items-center flex-1 min-w-[60px] group">
                  <div className="text-xs text-slate-500 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow-sm">
                    {val.toFixed(1)}m³
                  </div>
                  <div 
                    className="w-full bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all"
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                  <div className="text-xs text-slate-600 mt-2 font-medium truncate w-full text-center">
                    {record.monthYear.split('-').reverse().join('/')}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
            No data available for trend analysis.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, unit, color }) {
  return (
    <div className={`p-4 rounded-lg border ${color}`}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">{title}</div>
      <div className="text-2xl font-bold flex items-baseline gap-1">
        {value} <span className="text-sm font-medium opacity-70">{unit}</span>
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
  // Project Base Parameters
  const [budget, setBudget] = useState(120); // HKD Millions
  const [duration, setDuration] = useState(24); // Months
  const [complexity, setComplexity] = useState(1.1); // Multiplier
  
  // Decarbonisation Granular Parameters (0-100%)
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

  // AS04 Scope 2.4 Calculation Engine (Simulated)
  // Base intensity: ~14.5 tCO2e per HK$M, multiplied by complexity factor and duration drift.
  const durationFactor = 1 + ((duration - 24) * 0.005); 
  const baselineIntensity = 14.5 * complexity * durationFactor;
  const baselineEmissions = budget * baselineIntensity;

  // AS04 Scope 2.6: Granular Mitigations
  // Max theoretical reduction % per category:
  const rBess = (measures.bess / 100) * 8.5; 
  const rBio = (measures.biofuel / 100) * 5.2; 
  const rConcrete = (measures.lowCarbonConcrete / 100) * 15.0; 
  const rEV = (measures.electricVehicles / 100) * 3.3; 
  const rSteel = (measures.recycledSteel / 100) * 6.5; 

  const reductionPercentage = rBess + rBio + rConcrete + rEV + rSteel;
  const reductionAmount = baselineEmissions * (reductionPercentage / 100);
  
  // AS04 Scope 2.7: Output Target Formulation
  const forecastedEmissions = baselineEmissions - reductionAmount; 

  // AI Confidence Telemetry (Visual flavor)
  const dataPoints = 14500 + Math.floor(Math.random() * 100);
  const confidence = Math.max(85, 98 - (budget / 50) - Math.abs(complexity - 1) * 10).toFixed(1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        
        {/* Header Section */}
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
          
          {/* AI Telemetry Badge */}
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
          
          {/* Left Column: Project Baseline Parameters */}
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

          {/* Middle Column: Mitigation Tuning */}
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

          {/* Right Column: Target Outputs */}
          <div className="xl:col-span-3 space-y-6">
            <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
              <Target className="h-5 w-5 text-emerald-600" />
              3. Target Formulated
            </h3>
            
            <div className="bg-emerald-900 p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
              {/* Decorative background element */}
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

            {/* Gauge visualizer */}
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

// Sub-component for Forecasting Dashboard Sliders
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
