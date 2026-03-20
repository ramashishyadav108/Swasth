import { useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';

function App() {
  const exportRef = useRef<(() => void) | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout
              title="Pharmacy CRM"
              subtitle="Manage your pharmacy efficiently"
              showAddButton={false}
              onExportClick={() => exportRef.current?.()}
            >
              <Dashboard onRegisterExport={(fn) => { exportRef.current = fn; }} />
            </Layout>
          }
        />
        {/* <Route
          path="/inventory"
          element={
            <InventoryWrapper
              modalOpen={inventoryModalOpen}
              setModalOpen={setInventoryModalOpen}
            />
          }
        /> */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
