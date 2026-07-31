import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";
import AccountLayout from "../layouts/AccountLayout";

import ProtectedRoute from "./ProtectedRoute";

import HomePage from "../pages/public/HomePage";
import ReservationPage from "../pages/public/ReservationPage";
import ReservationConfirm from "../components/reservations/ReservationConfirm";
import AboutPage from "../pages/public/AboutPage";
import PrivacyPage from "../pages/public/PrivacyPage";
import FleetPage from "../pages/public/FleetPage";
import FaqPage from "../pages/public/FaqPage";
import TermsPage from "../pages/public/TermsPage";
import CookiePolicyPage from "../pages/public/CookiePolicyPage";
import GuestLookupPage from "../pages/public/GuestLookupPage";

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import VerifyEmailPage from "../pages/auth/VerifyEmailPage";
import VerifyEmailPendingPage from "../pages/auth/VerifyEmailPendingPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";

import DashboardPage from "../pages/admin/DashboardPage";
import UsersPage from "../pages/admin/UsersPage";
import ReservationsPage from "../pages/admin/ReservationsPage";
import VehiclesPage from "../pages/admin/VehiclesPage";
import CampaignsPage from "../pages/admin/CampaignsPage";
import LoyaltyPage from "../pages/admin/LoyaltyPage";
import PricingZonesPage from "../pages/admin/PricingZonesPage";
import PricingRulesPage from "../pages/admin/PricingRulesPage";
import NotificationsPage from "../pages/admin/NotificationsPage";
import AccountDashboardPage from "../pages/user/AccountDashboardPage";
import MyReservationsPage from "../pages/user/MyReservationsPage";
import MyProfilePage from "../pages/user/MyProfilePage";
import MyLoyaltyPage from "../pages/user/MyLoyaltyPage";
import ChangePasswordPage from "../pages/user/ChangePasswordPage";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route
            path="/"
            element={<HomePage />}
          />

          <Route
            path="/reservation"
            element={<ReservationPage />}
          />

          <Route
            path="/reservation/confirm"
            element={<ReservationConfirm />}
          />

          <Route
            path="/about"
            element={<AboutPage />}
          />

          <Route
            path="/privacy"
            element={<PrivacyPage />}
          />
          <Route
            path="/fleet"
            element={<FleetPage />}
          />
          <Route
            path="/faq"
            element={<FaqPage />}
          />
          <Route
            path="/terms"
            element={<TermsPage />}
          />
          <Route
            path="/cookies"
            element={<CookiePolicyPage />}
          />

          <Route
            path="/track"
            element={<GuestLookupPage />}
          />
        </Route>

        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />

          <Route
            path="/verify-email"
            element={<VerifyEmailPage />}
          />

          <Route
            path="/verify-email-pending"
            element={<VerifyEmailPendingPage />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPasswordPage />}
          />
        </Route>

        {/* Customer account */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={["CUSTOMER"]}
            />
          }
        >
          <Route
            path="/account"
            element={<AccountLayout />}
          >
            <Route
              index
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
              }
            />
            <Route
              path="dashboard"
              element={<AccountDashboardPage />}
            />
            <Route
              path="reservations"
              element={<MyReservationsPage />}
            />
            <Route
              path="loyalty"
              element={<MyLoyaltyPage />}
            />
            <Route
              path="profile"
              element={<MyProfilePage />}
            />
            <Route
              path="password"
              element={<ChangePasswordPage />}
            />
          </Route>
        </Route>

        {/* Admin */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            />
          }
        >
          <Route
            path="/admin"
            element={<AdminLayout />}
          >
            <Route
              index
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
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
            <Route
              path="pricing-rules"
              element={<PricingRulesPage />}
            />

            <Route
              path="notifications"
              element={<NotificationsPage />}
            />
            <Route
              path="account"
              element={<MyProfilePage />}
            />
            <Route
              path="password"
              element={<ChangePasswordPage />}
            />
          </Route>
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
