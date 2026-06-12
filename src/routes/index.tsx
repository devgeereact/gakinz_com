import type { ComponentType } from "react"
import { createBrowserRouter } from "react-router-dom"

// 🌐 PUBLIC CORPORATE SITE — eager (first paint, light bundle)
import PublicLayout from "@/marketing/PublicLayout"
import Home from "@/marketing/pages/Home"
import About from "@/marketing/pages/About"
import ServicesPage from "@/marketing/pages/Services"
import ServiceDetail from "@/marketing/pages/ServiceDetail"
import Pricing from "@/marketing/pages/Pricing"
import Sectors from "@/marketing/pages/Sectors"
import Work from "@/marketing/pages/Work"
import Resources from "@/marketing/pages/Resources"
import ResourceDetail from "@/marketing/pages/ResourceDetail"
import Contact from "@/marketing/pages/Contact"
import { Privacy, Terms, Cookies } from "@/marketing/pages/Legal"
import Verify from "@/marketing/pages/Verify"
import SmokeTest from "@/marketing/pages/SmokeTest"
import PublicNotFound from "@/marketing/pages/NotFound"

// 🔐 AUTH — eager only for the route guard + error boundary (both tiny). The
// login/register/cover/error PAGES are lazy (see below) so a marketing visitor
// never downloads the auth bundle on first paint.
import RequireAuth from "@/app/RequireAuth"
import ModuleStub from "@/app/modules/ModuleStub"
import ErrorPage from "@/pages/ErrorPage"

// 📊 CMS (/app/*) + 🔐 auth pages — lazy. The whole admin tree (charts, calendar,
// tiptap, pdf, xlsx) and the auth pages load only when their route is visited,
// so the public marketing site never downloads them. `lz` turns a default-export
// dynamic import into a React Router lazy route module; `lzNamed` does the same
// for a named export.
const lz = (factory: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await factory()).default,
})
const lzNamed =
  (factory: () => Promise<Record<string, ComponentType>>, name: string) => async () => ({
    Component: (await factory())[name],
  })

export const router = createBrowserRouter([
  // 🔐 Member login (standalone, full-screen) — lazy
  { path: "login", lazy: lz(() => import("@/app/Login")) },

  // 🌐 PUBLIC CORPORATE SITE (gakinz.com)
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "services", element: <ServicesPage /> },
      { path: "services/:slug", element: <ServiceDetail /> },
      { path: "pricing", element: <Pricing /> },
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

  // 🔐 AUTH ROUTES — layout + pages all lazy (off the marketing critical path)
  {
    lazy: lz(() => import("@/layouts/AuthLayout")),
    errorElement: <ErrorPage />,
    children: [
      { path: "auth/basic/login", lazy: lz(() => import("@/auth/basic/LoginPage")) },
      { path: "auth/basic/register", lazy: lz(() => import("@/auth/basic/RegisterPage")) },
      { path: "auth/basic/forgot-password", lazy: lz(() => import("@/auth/basic/ForgotPasswordPage")) },
      { path: "auth/basic/reset-password", lazy: lzNamed(() => import("@/auth/basic/ResetPasswordForm"), "ResetPasswordForm") },
      { path: "auth/basic/verify-email", lazy: lzNamed(() => import("@/auth/basic/VerifyEmailForm"), "VerifyEmailForm") },
      { path: "auth/basic/password-reset-success", lazy: lzNamed(() => import("@/auth/basic/PasswordResetSuccess"), "PasswordResetSuccess") },

      { path: "auth/cover/login", lazy: lz(() => import("@/auth/cover/CoverLoginPage")) },
      { path: "auth/cover/register", lazy: lz(() => import("@/auth/cover/CoverRegisterPage")) },
      { path: "auth/cover/forgot-password", lazy: lz(() => import("@/auth/cover/CoverForgotPasswordPage")) },
      { path: "auth/cover/new-password", lazy: lz(() => import("@/auth/cover/CoverResetPasswordPage")) },
      { path: "auth/cover/password-reset-success", lazy: lz(() => import("@/auth/cover/CoverPasswordResetSuccessPage")) },
      { path: "auth/cover/verify-email", lazy: lz(() => import("@/auth/cover/CoverVerifyEmailPage")) },

      { path: "error/error-404", lazy: lz(() => import("@/pages/error/Error404")) },
      { path: "error/error-500", lazy: lz(() => import("@/pages/error/Error500")) },
      { path: "error/coming-soon", lazy: lz(() => import("@/pages/error/ComingSoon")) },
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
      { index: true, lazy: lz(() => import("@/app/modules/Dashboard")) },

      // ── GAkinzOS modules ────────────────────────────────────────────────
      { path: "leads", lazy: lz(() => import("@/app/modules/Leads")) },
      { path: "clients", lazy: lz(() => import("@/app/modules/Clients")) },
      { path: "projects", lazy: lz(() => import("@/app/modules/Projects")) },
      { path: "proposals", lazy: lz(() => import("@/app/modules/Proposals")) },
      { path: "invoicing", lazy: lz(() => import("@/app/modules/Invoicing")) },
      { path: "portal", lazy: lz(() => import("@/app/modules/Portal")) },
      { path: "time", lazy: lz(() => import("@/app/modules/Time")) },
      { path: "support", lazy: lz(() => import("@/app/modules/Support")) },
      { path: "comms", element: <ModuleStub title="Communication Hub" blurb="Email, client messages, internal notes — every conversation tied to its project." /> },
      { path: "analytics", lazy: lz(() => import("@/app/modules/Analytics")) },
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
