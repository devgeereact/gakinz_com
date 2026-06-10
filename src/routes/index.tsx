import { createBrowserRouter } from "react-router-dom"

// 🌐 PUBLIC CORPORATE SITE
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

import AppLayout from "@/layouts/AppLayout"
import AuthLayout from "@/layouts/AuthLayout"

import AnalyticsDashboard from "@/pages/dashboard/analytics/AnalyticsDashboard"
import EcommerceDashboard from "@/pages/dashboard/eCommerce/EcommerceDashboard"
import CrmDashboard from "@/pages/dashboard/crm/CrmDashboard"

import ChartsPage from "@/pages/charts/recharts/ReChartsPage"

import DataWidgetsPage from "@/pages/widgets/data/DataWidgetsPage"
import StatisticsWidgetsPage from "@/pages/widgets/statistics/StatisticsWidgetsPage"

import LoginPage from "@/auth/basic/LoginPage"
import RegisterPage from "@/auth/basic/RegisterPage"
import ForgotPasswordPage from "@/auth/basic/ForgotPasswordPage"

import NotFound from "@/pages/NotFound"
import ErrorPage from "@/pages/ErrorPage"
import Documentation from "@/pages/Documentation"
import { ResetPasswordForm } from "@/auth/basic/ResetPasswordForm"
import { VerifyEmailForm } from "@/auth/basic/VerifyEmailForm"
import { PasswordResetSuccess } from "@/auth/basic/PasswordResetSuccess"
import CoverLoginPage from "@/auth/cover/CoverLoginPage"
import CoverForgotPasswordPage from "@/auth/cover/CoverForgotPasswordPage"
import CoverRegisterPage from "@/auth/cover/CoverRegisterPage"
import CoverResetPasswordPage from "@/auth/cover/CoverResetPasswordPage"
import CoverVerifyEmailPage from "@/auth/cover/CoverVerifyEmailPage"
import CoverPasswordResetSuccessPage from "@/auth/cover/CoverPasswordResetSuccessPage"
import ProductList from "@/pages/eCommerce/ProductList"
import ProductGrid from "@/pages/eCommerce/ProductGrid"
import AddProduct from "@/pages/eCommerce/AddProduct"
import CategoryList from "@/pages/eCommerce/CategoryList"
import OrderList from "@/pages/eCommerce/OrderList"
import OrderDetails from "@/pages/eCommerce/OrderDetails"
import InvoicePage from "@/pages/eCommerce/Invoice"
import InvoiceCard from "@/pages/eCommerce/InvoiceCard"
import CustomerList from "@/pages/eCommerce/CustomerList"
import CustomerDetails from "@/pages/eCommerce/CustomerDetails"
import ChatBox from "@/pages/apps/Chatbox"
import CalendarPage from "@/pages/apps/CalendarPage"
import FileManagerPage from "@/pages/apps/FileManager"
import AlertsPage from "@/pages/alerts/AlertsPage"
import AccordionPage from "@/pages/accordion/AccordionPage"
import SoonerPage from "@/pages/sooner/SoonerPage"
import BadgesPage from "@/pages/badges/BadgesPage"
import ButtonsPage from "@/pages/buttons/ButtonsPage"
import CardsPage from "@/pages/cards/CardsPage"
import ListGroupPage from "@/pages/listgroups/ListGroupPage"
import CarouselPage from "@/pages/carousels/CarouselPage"
import AvatarShowcase from "@/pages/mediaobject/AvatarShowcase"
import NavbarsPage from "@/pages/navbars/NavbarsPage"
import ProgressPage from "@/pages/progressbars/ProgressPage"
import SpinnerExamples from "@/pages/spinners/SpinnerExamples"
import Boxicons from "@/pages/icons/Boxicons"
import IconBootstrap from "@/pages/icons/Bootstrap"
import LucideIconsPage from "@/pages/icons/LucideIconsPage"
import PricingPage from "@/pages/pricing/PricingPage"
import FAQPage from "@/pages/FAQPage"
import Error404 from "@/pages/error/Error404"
import Error500 from "@/pages/error/Error500"
import ComingSoon from "@/pages/error/ComingSoon"
import ReChartsPage from "@/pages/charts/recharts/ReChartsPage"
import ApexChartsPage from "@/pages/charts/apexcharts/ApexChartsPage"
import UserProfile from "@/pages/account/UserProfile"
import EditProfile from "@/pages/account/EditProfile"
import PasswordSettings from "@/pages/account/PasswordSettings"
import NotificationSettings from "@/pages/account/NotificationSettings"
import BasicTables from "@/pages/tables/BasicTables"
import AdvanceTablesPage from "@/pages/tables/advance-tables/AdvanceTable"
import DataTablePage from "@/pages/tables/DataTablePage"
import BasicInput from "@/pages/forms/BasicInputs"
import FormInputGroup from "@/pages/forms/FormInputGroup"
import ChecksAndRadios from "@/pages/forms/ChecksAndRadios"
import FormLayouts from "@/pages/forms/FormLayouts"
import WizardPage from "@/pages/forms/wizard/WizardPage"
import FormTextEditor from "@/pages/forms/FormTextEditor"
import FileUpload01 from "@/pages/forms/fileupload/FileUpload01"
import DatePickerPage from "@/pages/forms/datepicker/DatePickerPage"
import SelectExamplesPage from "@/pages/forms/select/SelectExamplesPage"
import FormRepeater from "@/pages/forms/FormRepeater"
import LandingPage from "@/pages/dashboard/analytics/LandingPage"

export const router = createBrowserRouter (
  [
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
        {path: "login", element: <LoginPage /> },
        {path: "auth/basic/login", element: <LoginPage /> },
        {path: "auth/basic/register", element: <RegisterPage /> },
        {path: "auth/basic/forgot-password", element: <ForgotPasswordPage /> },
        {path: "auth/basic/reset-password", element: <ResetPasswordForm /> },
        {path: "auth/basic/verify-email", element: <VerifyEmailForm /> },
        {path: "auth/basic/password-reset-success", element: <PasswordResetSuccess /> },

        {path: "auth/cover/login", element: <CoverLoginPage /> },
        {path: "auth/cover/register", element: <CoverRegisterPage /> },
        {path: "auth/cover/forgot-password", element: <CoverForgotPasswordPage /> },
        {path: "auth/cover/new-password", element: <CoverResetPasswordPage /> },
        {path: "auth/cover/password-reset-success", element: <CoverPasswordResetSuccessPage /> },
        {path: "auth/cover/verify-email", element: <CoverVerifyEmailPage /> },

        {path: "error/error-404", element: <Error404 /> },
        {path: "error/error-500", element: <Error500 /> },
        {path: "error/coming-soon", element: <ComingSoon /> },

      ],
    },

    // 📊 APP ROUTES (CMS, behind login) — mounted under /app
    {
      path: "app",
      element: <AppLayout />,
      errorElement: <ErrorPage />,
      children: [
        {index: true, element: <AnalyticsDashboard /> },
        {path: "dashboard/analytics", element: <AnalyticsDashboard /> },
        {path: "dashboard/crm", element: <CrmDashboard /> },
        {path: "dashboard/eCommerce", element: <EcommerceDashboard /> },
        {path: "dashboard/landing-page", element: <LandingPage /> },
        
        {path: "dashboard/charts", element: <ChartsPage /> },
        {path: "widgets/data", element: <DataWidgetsPage /> },
        {path: "widgets/statistics", element: <StatisticsWidgetsPage /> },
        {path: "docs", element: <Documentation /> },

        // 🛍️ E-COMMERCE
        {path: "eCommerce/product-list", element: <ProductList /> },
        {path: "eCommerce/product-grid", element: <ProductGrid /> },
        {path: "eCommerce/add-product", element: <AddProduct /> },
        {path: "eCommerce/categories", element: <CategoryList /> },
        {path: "eCommerce/order-list", element: <OrderList /> },
        {path: "eCommerce/order-details", element: <OrderDetails /> },
        {path: "eCommerce/customer-list", element: <CustomerList /> },
        {path: "eCommerce/customer-details", element: <CustomerDetails /> },
        {path: "eCommerce/invoice", element: <InvoicePage /> },

        // application routes
        {path: "app/chatbox", element: <ChatBox /> },
        {path: "app/invoice-card", element: <InvoiceCard/> },
        {path: "app/calendar", element: <CalendarPage /> },
        {path: "app/file-manager", element: <FileManagerPage /> },

        // component 
        {path: "components/alerts", element: <AlertsPage /> },
        {path: "components/accordion", element: <AccordionPage/>},
        {path: "components/sooner", element: <SoonerPage/>},
        {path: "components/badges", element: <BadgesPage/>},
        {path: "components/buttons", element: <ButtonsPage/>},
        {path: "components/cards", element: <CardsPage/>},
        {path: "components/list-groups", element: <ListGroupPage/>},
        {path: "components/carousels", element: <CarouselPage/>},
        {path: "components/media-object", element: <AvatarShowcase/>},
        {path: "components/navbars", element: <NavbarsPage/>},
        {path: "components/progress", element: <ProgressPage/>},
        {path: "components/spinners", element: <SpinnerExamples/>},

         // boxicons
        {path: "icons/boxicons", element: <Boxicons/>},
        {path: "icons/bootstrap", element: <IconBootstrap/>},
        {path: "icons/lucide", element: <LucideIconsPage/>},
        {path: "pricing/pricing-tables", element: <PricingPage/>},
        {path: "faq", element: <FAQPage/>},

        // charts
        {path: "charts/recharts", element: <ReChartsPage/>},
        {path: "charts/apex-charts", element: <ApexChartsPage/>},

        // account
        {path: "account/profile", element: <UserProfile/>},
        {path: "account/edit-profile", element: <EditProfile/>},
        {path: "account/password-setting", element: <PasswordSettings/>},
        {path: "account/notifications", element: <NotificationSettings/>},

        // Tables
        {path: "tables/basic-tables", element: <BasicTables/>},
        {path: "tables/advanced-tables", element: <AdvanceTablesPage/>},
        {path: "tables/data-tables", element: <DataTablePage/>},

        // Forms
        {path: "forms/basic-inputs", element: <BasicInput/>},
        {path: "forms/input-groups", element: <FormInputGroup/>},
        {path: "forms/radio-checkboxes", element: <ChecksAndRadios/>},
        {path: "forms/form-layouts", element: <FormLayouts/>},
        {path: "forms/form-wizard", element: <WizardPage/>},
        {path: "forms/text-editor", element: <FormTextEditor/>},
        {path: "forms/file-upload", element: <FileUpload01/>},
        {path: "forms/date-pickers", element: <DatePickerPage/>},
        {path: "forms/select", element: <SelectExamplesPage/>},
        {path: "forms/form-repeat", element: <FormRepeater/>},
        
        
        // ✅ 404 HANDLER
        { path: "*", element: <NotFound /> },
      ],
    },
  ]
)
