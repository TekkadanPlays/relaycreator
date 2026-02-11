import { Outlet, Link } from "react-router";
import { useAuth } from "../stores/auth";
import { Radio, LogOut, Menu, Zap, Globe, User } from "lucide-react";
import { useState } from "react";

export default function Layout() {
  const { user, login, logout, loading } = useAuth();
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    try {
      setLoginError("");
      await login();
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar bg-base-100 shadow-sm mx-auto max-w-7xl">
        <div className="flex-1">
          <Link to="/" className="text-2xl lg:text-4xl font-extrabold text-primary flex items-center gap-2">
            <Radio className="w-8 h-8" />
            relay.tools
          </Link>
        </div>

        <div className="flex-none">
          {loading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : user ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-10">
                  <span className="text-sm font-mono">{user.pubkey.slice(0, 4)}</span>
                </div>
              </label>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-50 p-2 shadow-lg bg-base-200 rounded-box w-52">
                <li><Link to="/relays/myrelays"><Zap className="w-4 h-4" /> My Relays</Link></li>
                <li><Link to="/invoices"><Globe className="w-4 h-4" /> Invoices</Link></li>
                <li><Link to="/directory"><User className="w-4 h-4" /> Directory</Link></li>
                <li className="border-t border-base-300 mt-1 pt-1">
                  <Link to="/signup"><Radio className="w-4 h-4" /> Create Relay</Link>
                </li>
                <li>
                  <button onClick={logout}><LogOut className="w-4 h-4" /> Sign Out</button>
                </li>
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/" className="btn btn-ghost btn-sm hidden lg:flex">Home</Link>
              <Link to="/directory" className="btn btn-ghost btn-sm hidden lg:flex">Directory</Link>
              <button onClick={handleLogin} className="btn btn-primary btn-sm">Sign In</button>

              {/* Mobile menu */}
              <div className="dropdown dropdown-end lg:hidden">
                <label tabIndex={0} className="btn btn-ghost btn-circle">
                  <Menu className="w-5 h-5" />
                </label>
                <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-50 p-2 shadow-lg bg-base-200 rounded-box w-52">
                  <li><Link to="/">Home</Link></li>
                  <li><Link to="/directory">Directory</Link></li>
                  <li><Link to="/signup">Create Relay</Link></li>
                  <li><button onClick={handleLogin}>Sign In</button></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {loginError && (
        <div className="max-w-7xl mx-auto px-4 mt-2">
          <div className="alert alert-error text-sm">
            <span>{loginError}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => setLoginError("")}>✕</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
