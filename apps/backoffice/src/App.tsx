import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Games from './pages/Games';
import Members from './pages/Members';
import Seasons from './pages/Seasons';
import Subscriptions from './pages/Subscriptions';

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/games" element={<Games />} />
        <Route path="/members" element={<Members />} />
        <Route path="/seasons" element={<Seasons />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
      </Routes>
    </Layout>
  );
}

export default App;

