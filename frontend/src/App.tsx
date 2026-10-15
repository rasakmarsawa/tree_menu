import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom';
import { CreateMenuPage } from './pages/CreateMenuPage';
import { FlatMenuPage } from './pages/FlatMenuPage';
import { TreeViewPage } from './pages/TreeViewPage';
import { SidebarTreePage } from './pages/SidebarTreePage';
import './App.css';

function Layout() {
  return (
    <div className="app-layout">
      <nav className="main-nav">
        <Link to="/menu" className="nav-brand">Menu Manager</Link>
        <ul className="nav-links">
          <li><Link to="/menu">Menu Items</Link></li>
          <li><Link to="/create">Create Menu</Link></li>
          <li><Link to="/tree">View Tree</Link></li>
          <li><Link to="/sidebar">Sidebar Tree</Link></li>
        </ul>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome to the Menu Manager</p>
      </header>
      <div className="dashboard-cards">
        <Link to="/menu" className="card">
          <h3>View Menu Items</h3>
          <p>Browse all menu items in a flat list</p>
        </Link>
        <Link to="/create" className="card">
          <h3>Create Menu Item</h3>
          <p>Add a new entry to the navigation menu</p>
        </Link>
        <Link to="/tree" className="card">
          <h3>View Menu Tree</h3>
          <p>Browse the full nested menu structure</p>
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="menu" element={<FlatMenuPage />} />
          <Route path="create" element={<CreateMenuPage />} />
          <Route path="edit/:id" element={<CreateMenuPage />} />
          <Route path="tree" element={<TreeViewPage />} />
          <Route path="sidebar" element={<SidebarTreePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;