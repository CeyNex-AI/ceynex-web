import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import Logo from "./components/Logo";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./lib/auth";
import { ROLE_LABELS } from "./lib/roles";
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
  const { userId, role } = useAuth();

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
        {role === "admin" && (
          <NavLink to="/admin" className={({ isActive }) => navLinkClass(isActive)}>
            Admin
          </NavLink>
        )}
      </div>
      {role && (
        <span className="ml-auto text-xs font-medium text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
          {ROLE_LABELS[role]}
        </span>
      )}
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
          <Route
            path="/query"
            element={
              <RequireAuth>
                <Query />
              </RequireAuth>
            }
          />
          <Route
            path="/help"
            element={
              <RequireAuth>
                <Help />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <Admin />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
