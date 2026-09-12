import { useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import Logo from "./components/Logo";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./lib/auth";
import { ROLE_LABELS } from "./lib/roles";
import { ThemeProvider } from "./lib/theme";
import { useAuth } from "./lib/useAuth";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Help from "./pages/Help";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import QueryWorkspace from "./pages/QueryWorkspace";
import ScenarioWorkbench from "./pages/ScenarioWorkbench";
import SharedConversation from "./pages/SharedConversation";
import Signup from "./pages/Signup";

function navLinkClass(isActive: boolean, stacked: boolean) {
  const base = stacked ? "block px-3 py-2 rounded-md text-sm font-medium transition-colors" : navLinkClassInline;
  return `${base} ${isActive ? "bg-teal-50 text-teal-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`;
}
const navLinkClassInline = "px-3 py-1.5 rounded-md text-sm font-medium transition-colors";

function NavBar() {
  const { userId, role } = useAuth();
  // The full row (logo + 4 links + role badge) needs ~460px minimum, which
  // doesn't fit any common phone width -- measured live 2026-08-26, this
  // isn't a guess. Below md, the links/badge collapse into a toggled panel
  // instead of wrapping or overflowing.
  const [menuOpen, setMenuOpen] = useState(false);

  const links = (stacked: boolean) => (
    <>
      {!userId && (
        <>
          <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive, stacked)} onClick={() => setMenuOpen(false)}>
            Login
          </NavLink>
          <NavLink to="/signup" className={({ isActive }) => navLinkClass(isActive, stacked)} onClick={() => setMenuOpen(false)}>
            Sign up
          </NavLink>
        </>
      )}
      <NavLink to="/query" className={({ isActive }) => navLinkClass(isActive, stacked)} onClick={() => setMenuOpen(false)}>
        Query
      </NavLink>
      <NavLink to="/scenario" className={({ isActive }) => navLinkClass(isActive, stacked)} onClick={() => setMenuOpen(false)}>
        Scenario
      </NavLink>
      <NavLink to="/help" className={({ isActive }) => navLinkClass(isActive, stacked)} onClick={() => setMenuOpen(false)}>
        Help
      </NavLink>
      <NavLink to="/account" className={({ isActive }) => navLinkClass(isActive, stacked)} onClick={() => setMenuOpen(false)}>
        Account
      </NavLink>
      {role === "admin" && (
        <NavLink to="/admin" className={({ isActive }) => navLinkClass(isActive, stacked)} onClick={() => setMenuOpen(false)}>
          Admin
        </NavLink>
      )}
    </>
  );

  return (
    <nav className="print:hidden bg-white border-b border-gray-200 px-4 sm:px-6 py-3 relative">
      <div aria-hidden="true" className="cx-nav-hairline absolute top-0 left-0 right-0 h-[3px]" />
      <div className="flex items-center gap-1">
        <Link to={userId ? "/query" : "/"} className="flex items-center gap-2 mr-6">
          <Logo />
          <span className="font-display text-sm font-bold text-gray-900 tracking-tight">CeyNex</span>
        </Link>
        <div className="hidden md:flex items-center gap-1">{links(false)}</div>
        {role && (
          <span className="hidden md:inline-block ml-auto text-xs font-medium text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
            {ROLE_LABELS[role]}
          </span>
        )}
        <button
          type="button"
          className="md:hidden ml-auto text-sm font-medium text-gray-600 hover:text-gray-900 rounded-md px-3 py-1.5"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>
      {menuOpen && (
        <div id="mobile-nav-menu" className="md:hidden mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1">
          {links(true)}
          {role && (
            <span className="mt-1 self-start text-xs font-medium text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
              {ROLE_LABELS[role]}
            </span>
          )}
        </div>
      )}
    </nav>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Keyboard-only users can jump straight past the nav; visually
           * hidden until focused, matching the standard skip-link pattern. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:text-teal-700 focus:text-sm focus:font-medium focus:rounded-md focus:px-3 focus:py-2 focus:ring-2 focus:ring-teal-500"
          >
            Skip to main content
          </a>
          <NavBar />
          <main id="main-content">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/query"
                element={
                  <RequireAuth>
                    <QueryWorkspace />
                  </RequireAuth>
                }
              />
              <Route
                path="/scenario"
                element={
                  <RequireAuth>
                    <ScenarioWorkbench />
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
              {/* Outside RequireAuth on purpose — see SharedConversation.tsx.
                  Read-only, no composer, and it carries no identity. */}
              <Route path="/shared/:token" element={<SharedConversation />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
