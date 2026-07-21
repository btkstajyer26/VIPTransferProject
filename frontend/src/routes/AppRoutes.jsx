import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";

import ProtectedRoute from "./ProtectedRoute";

import HomePage from "../pages/public/HomePage";
import ReservationPage from "../pages/public/ReservationPage";
import LoginPage from "../pages/auth/LoginPage";

import DashboardPage from "../pages/admin/DashboardPage";
import UsersPage from "../pages/admin/UsersPage";
import ReservationsPage from "../pages/admin/ReservationsPage";
import VehiclesPage from "../pages/admin/VehiclesPage";
import CampaignsPage from "../pages/admin/CampaignsPage";
import LoyaltyPage from "../pages/admin/LoyaltyPage";
import PricingZonesPage from "../pages/admin/PricingZonesPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public sayfalar */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/reservation"
            element={<ReservationPage />}
          />
        </Route>

        {/* Auth sayfaları */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Sadece ADMIN rolü erişebilir */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]} />
          }
        >
          <Route path="/admin" element={<AdminLayout />}>
            <Route
              index
              element={
                <Navigate to="dashboard" replace />
              }
            />

            <Route
              path="dashboard"
              element={<DashboardPage />}
            />

            <Route
              path="users"
              element={<UsersPage />}
            />

            <Route
              path="reservations"
              element={<ReservationsPage />}
            />

            <Route
              path="vehicles"
              element={<VehiclesPage />}
            />

            <Route
              path="campaigns"
              element={<CampaignsPage />}
            />

            <Route
              path="loyalty"
              element={<LoyaltyPage />}
            />

            <Route
              path="pricing-zones"
              element={<PricingZonesPage />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;