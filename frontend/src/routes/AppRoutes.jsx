import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { lazy, Suspense } from "react";

import PublicLayout from "../layouts/PublicLayout";
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";
import AccountLayout from "../layouts/AccountLayout";

import ProtectedRoute from "./ProtectedRoute";

const HomePage = lazy(() => import("../pages/public/HomePage"));
const ReservationPage = lazy(() => import("../pages/public/ReservationPage"));
const GuestReservationTrackPage = lazy(() => import("../pages/public/GuestReservationTrackPage"));
const GuestLookupPage = lazy(() => import("../pages/public/GuestLookupPage"));
const ReservationConfirm = lazy(() => import("../components/reservations/ReservationConfirm"));
const AboutPage = lazy(() => import("../pages/public/AboutPage"));
const PrivacyPage = lazy(() => import("../pages/public/PrivacyPage"));
const FleetPage = lazy(() => import("../pages/public/FleetPage"));
const FaqPage = lazy(() => import("../pages/public/FaqPage"));
const TermsPage = lazy(() => import("../pages/public/TermsPage"));
const CookiePolicyPage = lazy(() => import("../pages/public/CookiePolicyPage"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const VerifyEmailPage = lazy(() => import("../pages/auth/VerifyEmailPage"));
const VerifyEmailPendingPage = lazy(() => import("../pages/auth/VerifyEmailPendingPage"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage"));
const DashboardPage = lazy(() => import("../pages/admin/DashboardPage"));
const UsersPage = lazy(() => import("../pages/admin/UsersPage"));
const ReservationsPage = lazy(() => import("../pages/admin/ReservationsPage"));
const VehiclesPage = lazy(() => import("../pages/admin/VehiclesPage"));
const CampaignsPage = lazy(() => import("../pages/admin/CampaignsPage"));
const LoyaltyPage = lazy(() => import("../pages/admin/LoyaltyPage"));
const PricingZonesPage = lazy(() => import("../pages/admin/PricingZonesPage"));
const PricingRulesPage = lazy(() => import("../pages/admin/PricingRulesPage"));
const NotificationsPage = lazy(() => import("../pages/admin/NotificationsPage"));
const TranslationsPage = lazy(() => import("../pages/admin/TranslationsPage"));
const AccountDashboardPage = lazy(() => import("../pages/user/AccountDashboardPage"));
const MyReservationsPage = lazy(() => import("../pages/user/MyReservationsPage"));
const MyProfilePage = lazy(() => import("../pages/user/MyProfilePage"));
const MyLoyaltyPage = lazy(() => import("../pages/user/MyLoyaltyPage"));
const ChangePasswordPage = lazy(() => import("../pages/user/ChangePasswordPage"));
const AccountSettingsPage = lazy(() => import("../pages/user/AccountSettingsPage"));

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]"><div className="size-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-label="Sayfa yükleniyor" /></div>}>
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
            path="/reservation/track"
            element={<GuestReservationTrackPage />}
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
            <Route path="settings" element={<AccountSettingsPage />} />
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
            <Route path="translations" element={<TranslationsPage />} />
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
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRoutes;
