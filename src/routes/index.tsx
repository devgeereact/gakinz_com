import type { ComponentType } from "react"
import { createBrowserRouter } from "react-router-dom"

// 🌐 PUBLIC CORPORATE SITE — eager (first paint, light bundle)
import PublicLayout from "@/marketing/PublicLayout"
import Home from "@/marketing/pages/Home"
import About from "@/marketing/pages/About"
import ServicesPage from "@/marketing/pages/Services"
import ServiceDetail from "@/marketing/pages/ServiceDetail"
import Sectors from "@/marketing/pages/Sectors"
import Work from "@/marketing/pages/Work"
import Resources from "@/marketing/pages/Resources"
import ResourceDetail from "@/marketing/pages/ResourceDetail"
import Contact from "@/marketing/pages/Contact"
import { Privacy, Terms, Cookies } from "@/marketing/pages/Legal"
import Verify from "@/marketing/pages/Verify"
import SmokeTest from "@/marketing/pages/SmokeTest"
import PublicNotFound from "@/marketing/pages/NotFound"

// 🔐 AUTH — eager (login is the entry to the CMS; no heavy deps)
import RequireAuth from "@/app/RequireAuth"
import Login from "@/app/Login"
import ModuleStub from "@/app/modules/ModuleStub"
import AuthLayout from "@/layouts/AuthLayout"
import LoginPage from "@/auth/basic/LoginPage"
import RegisterPage from "@/auth/basic/RegisterPage"
import ForgotPasswordPage from "@/auth/basic/ForgotPasswordPage"
import { ResetPasswordForm } from "@/auth/basic/ResetPasswordForm"
import { VerifyEmailForm } from "@/auth/basic/VerifyEmailForm"
import { PasswordResetSuccess } from "@/auth/basic/PasswordResetSuccess"
import CoverLoginPage from "@/auth/cover/CoverLoginPage"
import CoverForgotPasswordPage from "@/auth/cover/CoverForgotPasswordPage"
import CoverRegisterPage from "@/auth/cover/CoverRegisterPage"
import CoverResetPasswordPage from "@/auth/cover/CoverResetPasswordPage"
import CoverVerifyEmailPage from "@/auth/cover/CoverVerifyEmailPage"
import CoverPasswordResetSuccessPage from "@/auth/cover/CoverPasswordResetSuccessPage"
import Error404 from "@/pages/error/Error404"
import Error500 from "@/pages/error/Error500"
import ComingSoon from "@/pages/error/ComingSoon"

import ErrorPage from "@/pages/ErrorPage"

// 📊 CMS (/app/*) — lazy. The whole admin tree (charts, calendar, tiptap, pdf,
// xlsx) is loaded only when a /app route is visited, so the public marketing
// site never downloads it. `lz` turns a default-export dynamic import into a
// React Router lazy route module.
const lz = (factory: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await factory()).default,
})

export const router = createBrowserRouter([
  // 🔐 Member login (standalone, full-screen)
  { path: "login", element: <Login /> },

  // 🌐 PUBLIC CORPORATE SITE (gakinz.com)
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "services", element: <ServicesPage /> },
      { path: "services/:slug", element: <ServiceDetail /> },
      { path: "sectors", element: <Sectors /> },
      { path: "work", element: <Work /> },
      { path: "resources", element: <Resources /> },
      { path: "resources/:slug", element: <ResourceDetail /> },
      { path: "contact", element: <Contact /> },
      { path: "privacy", element: <Privacy /> },
      { path: "terms", element: <Terms /> },
      { path: "cookies", element: <Cookies /> },
      { path: "verify/:id", element: <Verify /> },
      { path: "smoke", element: <SmokeTest /> },
      { path: "*", element: <PublicNotFound /> },
    ],
  },

  // 🔐 AUTH ROUTES
  {
    element: <AuthLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "auth/basic/login", element: <LoginPage /> },
      { path: "auth/basic/register", element: <RegisterPage /> },
      { path: "auth/basic/forgot-password", element: <ForgotPasswordPage /> },
      { path: "auth/basic/reset-password", element: <ResetPasswordForm /> },
      { path: "auth/basic/verify-email", element: <VerifyEmailForm /> },
      { path: "auth/basic/password-reset-success", element: <PasswordResetSuccess /> },

      { path: "auth/cover/login", element: <CoverLoginPage /> },
      { path: "auth/cover/register", element: <CoverRegisterPage /> },
      { path: "auth/cover/forgot-password", element: <CoverForgotPasswordPage /> },
      { path: "auth/cover/new-password", element: <CoverResetPasswordPage /> },
      { path: "auth/cover/password-reset-success", element: <CoverPasswordResetSuccessPage /> },
      { path: "auth/cover/verify-email", element: <CoverVerifyEmailPage /> },

      { path: "error/error-404", element: <Error404 /> },
      { path: "error/error-500", element: <Error500 /> },
      { path: "error/coming-soon", element: <ComingSoon /> },
    ],
  },

  // 📊 APP ROUTES (CMS) — guarded by RequireAuth, mounted under /app, all lazy
  {
    element: <RequireAuth />,
    children: [
      {
        path: "app",
        lazy: lz(() => import("@/layouts/AppLayout")),
        errorElement: <ErrorPage />,
        children: [
      { index: true, lazy: lz(() => import("@/pages/dashboard/analytics/AnalyticsDashboard")) },

      // ── GAkinzOS modules ────────────────────────────────────────────────
      { path: "leads", lazy: lz(() => import("@/app/modules/Leads")) },
      { path: "clients", lazy: lz(() => import("@/app/modules/Clients")) },
      { path: "projects", lazy: lz(() => import("@/app/modules/Projects")) },
      { path: "proposals", lazy: lz(() => import("@/app/modules/Proposals")) },
      { path: "invoicing", lazy: lz(() => import("@/app/modules/Invoicing")) },
      { path: "portal", element: <ModuleStub title="Client Portal" blurb="Clients track progress, approve work, view invoices and files." /> },
      { path: "time", lazy: lz(() => import("@/app/modules/Time")) },
      { path: "support", lazy: lz(() => import("@/app/modules/Support")) },
      { path: "comms", element: <ModuleStub title="Communication Hub" blurb="Email, client messages, internal notes — every conversation tied to its project." /> },
      { path: "analytics", element: <ModuleStub title="Analytics & Reporting" blurb="Revenue, pipeline, project profitability, utilisation." /> },
      { path: "platform", lazy: lz(() => import("@/app/modules/Platform")) },

      { path: "dashboard/analytics", lazy: lz(() => import("@/pages/dashboard/analytics/AnalyticsDashboard")) },
      { path: "dashboard/crm", lazy: lz(() => import("@/pages/dashboard/crm/CrmDashboard")) },
      { path: "dashboard/eCommerce", lazy: lz(() => import("@/pages/dashboard/eCommerce/EcommerceDashboard")) },
      { path: "dashboard/landing-page", lazy: lz(() => import("@/pages/dashboard/analytics/LandingPage")) },

      { path: "dashboard/charts", lazy: lz(() => import("@/pages/charts/recharts/ReChartsPage")) },
      { path: "widgets/data", lazy: lz(() => import("@/pages/widgets/data/DataWidgetsPage")) },
      { path: "widgets/statistics", lazy: lz(() => import("@/pages/widgets/statistics/StatisticsWidgetsPage")) },
      { path: "docs", lazy: lz(() => import("@/pages/Documentation")) },

      // 🛍️ E-COMMERCE
      { path: "eCommerce/product-list", lazy: lz(() => import("@/pages/eCommerce/ProductList")) },
      { path: "eCommerce/product-grid", lazy: lz(() => import("@/pages/eCommerce/ProductGrid")) },
      { path: "eCommerce/add-product", lazy: lz(() => import("@/pages/eCommerce/AddProduct")) },
      { path: "eCommerce/categories", lazy: lz(() => import("@/pages/eCommerce/CategoryList")) },
      { path: "eCommerce/order-list", lazy: lz(() => import("@/pages/eCommerce/OrderList")) },
      { path: "eCommerce/order-details", lazy: lz(() => import("@/pages/eCommerce/OrderDetails")) },
      { path: "eCommerce/customer-list", lazy: lz(() => import("@/pages/eCommerce/CustomerList")) },
      { path: "eCommerce/customer-details", lazy: lz(() => import("@/pages/eCommerce/CustomerDetails")) },
      { path: "eCommerce/invoice", lazy: lz(() => import("@/pages/eCommerce/Invoice")) },

      // application routes
      { path: "app/chatbox", lazy: lz(() => import("@/pages/apps/Chatbox")) },
      { path: "app/invoice-card", lazy: lz(() => import("@/pages/eCommerce/InvoiceCard")) },
      { path: "app/calendar", lazy: lz(() => import("@/pages/apps/CalendarPage")) },
      { path: "app/file-manager", lazy: lz(() => import("@/pages/apps/FileManager")) },

      // components
      { path: "components/alerts", lazy: lz(() => import("@/pages/alerts/AlertsPage")) },
      { path: "components/accordion", lazy: lz(() => import("@/pages/accordion/AccordionPage")) },
      { path: "components/sooner", lazy: lz(() => import("@/pages/sooner/SoonerPage")) },
      { path: "components/badges", lazy: lz(() => import("@/pages/badges/BadgesPage")) },
      { path: "components/buttons", lazy: lz(() => import("@/pages/buttons/ButtonsPage")) },
      { path: "components/cards", lazy: lz(() => import("@/pages/cards/CardsPage")) },
      { path: "components/list-groups", lazy: lz(() => import("@/pages/listgroups/ListGroupPage")) },
      { path: "components/carousels", lazy: lz(() => import("@/pages/carousels/CarouselPage")) },
      { path: "components/media-object", lazy: lz(() => import("@/pages/mediaobject/AvatarShowcase")) },
      { path: "components/navbars", lazy: lz(() => import("@/pages/navbars/NavbarsPage")) },
      { path: "components/progress", lazy: lz(() => import("@/pages/progressbars/ProgressPage")) },
      { path: "components/spinners", lazy: lz(() => import("@/pages/spinners/SpinnerExamples")) },

      // icons
      { path: "icons/boxicons", lazy: lz(() => import("@/pages/icons/Boxicons")) },
      { path: "icons/bootstrap", lazy: lz(() => import("@/pages/icons/Bootstrap")) },
      { path: "icons/lucide", lazy: lz(() => import("@/pages/icons/LucideIconsPage")) },
      { path: "pricing/pricing-tables", lazy: lz(() => import("@/pages/pricing/PricingPage")) },
      { path: "faq", lazy: lz(() => import("@/pages/FAQPage")) },

      // charts
      { path: "charts/recharts", lazy: lz(() => import("@/pages/charts/recharts/ReChartsPage")) },
      { path: "charts/apex-charts", lazy: lz(() => import("@/pages/charts/apexcharts/ApexChartsPage")) },

      // account
      { path: "account/profile", lazy: lz(() => import("@/pages/account/UserProfile")) },
      { path: "account/edit-profile", lazy: lz(() => import("@/pages/account/EditProfile")) },
      { path: "account/password-setting", lazy: lz(() => import("@/pages/account/PasswordSettings")) },
      { path: "account/notifications", lazy: lz(() => import("@/pages/account/NotificationSettings")) },

      // tables
      { path: "tables/basic-tables", lazy: lz(() => import("@/pages/tables/BasicTables")) },
      { path: "tables/advanced-tables", lazy: lz(() => import("@/pages/tables/advance-tables/AdvanceTable")) },
      { path: "tables/data-tables", lazy: lz(() => import("@/pages/tables/DataTablePage")) },

      // forms
      { path: "forms/basic-inputs", lazy: lz(() => import("@/pages/forms/BasicInputs")) },
      { path: "forms/input-groups", lazy: lz(() => import("@/pages/forms/FormInputGroup")) },
      { path: "forms/radio-checkboxes", lazy: lz(() => import("@/pages/forms/ChecksAndRadios")) },
      { path: "forms/form-layouts", lazy: lz(() => import("@/pages/forms/FormLayouts")) },
      { path: "forms/form-wizard", lazy: lz(() => import("@/pages/forms/wizard/WizardPage")) },
      { path: "forms/text-editor", lazy: lz(() => import("@/pages/forms/FormTextEditor")) },
      { path: "forms/file-upload", lazy: lz(() => import("@/pages/forms/fileupload/FileUpload01")) },
      { path: "forms/date-pickers", lazy: lz(() => import("@/pages/forms/datepicker/DatePickerPage")) },
      { path: "forms/select", lazy: lz(() => import("@/pages/forms/select/SelectExamplesPage")) },
      { path: "forms/form-repeat", lazy: lz(() => import("@/pages/forms/FormRepeater")) },

      // ✅ 404 HANDLER
          { path: "*", lazy: lz(() => import("@/pages/NotFound")) },
        ],
      },
    ],
  },
])
