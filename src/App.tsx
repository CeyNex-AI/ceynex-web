import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Query from './pages/Query'
import Help from './pages/Help'
import Account from './pages/Account'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex gap-6 text-sm">
        <Link to="/">Login</Link>
        <Link to="/query">Query</Link>
        <Link to="/help">Help</Link>
        <Link to="/account">Account</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/query" element={<Query />} />
        <Route path="/help" element={<Help />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App