/** Rotas públicas em inglês, com conteúdo localizado em português do Brasil. */
import { Route, Switch } from "wouter";
import { Toaster } from "sonner";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import StoreOnboardingPage from "@/pages/StoreOnboardingPage";
import PlanOnboardingPage from "@/pages/PlanOnboardingPage";
import BillingReturnPage from "@/pages/BillingReturnPage";
import DashboardPage from "@/pages/DashboardPage";
import AccountPage from "@/pages/AccountPage";
import StoreEditPage from "@/pages/StoreEditPage";
import BillingOrdersPage from "@/pages/BillingOrdersPage";
import ProductsPage from "@/pages/ProductsPage";
import CustomersPage from "@/pages/CustomersPage";
import CouponsPage from "@/pages/CouponsPage";
import BannersPage from "@/pages/BannersPage";
import SettingsPage from "@/pages/SettingsPage";
import IntegrationGuidePage from "@/pages/IntegrationGuidePage";
import OrdersPage from "@/pages/OrdersPage";
import Home from "@/pages/Home";
import PublicStorefrontPage from "@/pages/PublicStorefrontPage";
import NotFound from "@/pages/NotFound";

export default function App() {
  return <><Switch><Route path="/" component={Home} /><Route path={/^\/@(?<slug>[^/]+)\/categoria\/(?<categorySlug>[^/]+)$/} component={() => <PublicStorefrontPage screen="category" />} /><Route path={/^\/@(?<slug>[^/]+)\/produto\/(?<productSlug>[^/]+)$/} component={() => <PublicStorefrontPage screen="product" />} /><Route path={/^\/@(?<slug>[^/]+)\/busca$/} component={() => <PublicStorefrontPage screen="search" />} /><Route path={/^\/@(?<slug>[^/]+)\/pagina\/(?<pageSlug>[^/]+)$/} component={() => <PublicStorefrontPage screen="page" />} /><Route path={/^\/@(?<slug>[^/]+)$/} component={() => <PublicStorefrontPage screen="home" />} /><Route path="/login" component={LoginPage} /><Route path="/register" component={RegisterPage} /><Route path="/forgot-password" component={ForgotPasswordPage} /><Route path="/reset-password" component={ResetPasswordPage} /><Route path="/onboarding/store" component={StoreOnboardingPage} /><Route path="/onboarding/plan" component={PlanOnboardingPage} /><Route path="/billing/return" component={BillingReturnPage} /><Route path="/dashboard" component={DashboardPage} /><Route path="/orders/:orderId" component={OrdersPage} /><Route path="/orders" component={OrdersPage} /><Route path="/products/categories/create" component={ProductsPage} /><Route path="/products/categories/:categoryId/edit" component={ProductsPage} /><Route path="/products/categories" component={ProductsPage} /><Route path="/products/create" component={ProductsPage} /><Route path="/products/:productId/edit" component={ProductsPage} /><Route path="/products/:productId" component={ProductsPage} /><Route path="/products" component={ProductsPage} /><Route path="/customers/create" component={CustomersPage} /><Route path="/customers/:customerId/edit" component={CustomersPage} /><Route path="/customers/:customerId" component={CustomersPage} /><Route path="/customers" component={CustomersPage} /><Route path="/coupons/create" component={CouponsPage} /><Route path="/coupons/:couponId/edit" component={CouponsPage} /><Route path="/coupons/:couponId" component={CouponsPage} /><Route path="/coupons" component={CouponsPage} /><Route path="/banners/create" component={BannersPage} /><Route path="/banners/:bannerId/edit" component={BannersPage} /><Route path="/banners/:bannerId" component={BannersPage} /><Route path="/banners" component={BannersPage} /><Route path="/settings/integrations-guide" component={IntegrationGuidePage} /><Route path="/settings" component={SettingsPage} /><Route path="/account" component={AccountPage} /><Route path="/stores/:id/edit" component={StoreEditPage} /><Route path="/billing/orders" component={BillingOrdersPage} /><Route component={NotFound} /></Switch><Toaster position="top-center" richColors closeButton /></>;
}
