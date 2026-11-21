import React, { useEffect, useState } from 'react';
import Storefront from './components/Storefront.jsx';
import AdminPortal from './admin/AdminPortal.jsx';

export default function App() {
  const [route, setRoute] = useState(() =>
    window.location.pathname.startsWith('/admin') ? 'admin' : 'store'
  );
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onPop() {
      setRoute(window.location.pathname.startsWith('/admin') ? 'admin' : 'store');
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(target) {
    const nextPath = target === 'admin' ? '/admin' : '/';
    window.history.pushState({}, '', nextPath);
    setRoute(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pushToast(msg) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }

  return (
    <>
      {route === 'admin' ? (
        <AdminPortal onNavigateStore={() => navigate('store')} onToast={pushToast} />
      ) : (
        <Storefront onNavigateAdmin={() => navigate('admin')} onToast={pushToast} />
      )}

      <div className="toast-container">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}
