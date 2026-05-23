import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Login';
import StandardSearch from './pages/StandardSearch';
import RegisterPage from './pages/Register';
import DetailPage from './pages/DetailPage';
import DataAnalysis from './pages/DataAnalysis';
import DraftingUnit from './pages/DraftingUnit';
import DraftingUnitStats from './pages/DraftingUnit/Stats';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/search" replace />} />
          <Route path="search" element={<StandardSearch />} />
          <Route path="analytics" element={<DataAnalysis />} />
          <Route path="units" element={<DraftingUnit />} />
          <Route path="units/stats" element={<DraftingUnitStats />} />
          <Route path="detail/:std_id" element={<DetailPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
