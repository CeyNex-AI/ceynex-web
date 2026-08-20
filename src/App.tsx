import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import Logo from "./components/Logo";
import { AuthProvider } from "./lib/auth";
import { useAuth } from "./lib/useAuth";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Help from "./pages/Help";
import Login from "./pages/Login";
import Query from "./pages/Query";

function navLinkClass(isActive: boolean) {
  return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive ? "bg-teal-50 text-teal-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
  }`;
}

function NavBar() {
  const { userId } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-1">
      <Link to={userId ? "/query" : "/"} className="flex items-center gap-2 mr-6">
        <Logo />
        <span className="text-sm font-semibold text-gray-900 tracking-tight">CeyNex</span>
      </Link>
      <div className="flex items-center gap-1">
        {!userId && (
          <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
            Login
          </NavLink>
        )}
        <NavLink to="/query" className={({ isActive }) => navLinkClass(isActive)}>
          Query
        </NavLink>
        <NavLink to="/help" className={({ isActive }) => navLinkClass(isActive)}>
          Help
        </NavLink>
        <NavLink to="/account" className={({ isActive }) => navLinkClass(isActive)}>
          Account
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => navLinkClass(isActive)}>
          Admin
        </NavLink>
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/query" element={<Query />} />
          <Route path="/help" element={<Help />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
