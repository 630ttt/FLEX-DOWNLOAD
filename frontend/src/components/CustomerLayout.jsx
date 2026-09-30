import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
const CustomerLayout = () => {
  return (
    <>
      <Navbar />
      <main className="site-main" id="main-content">
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default CustomerLayout;
