import { Outlet } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import Navbar from './Navbar';
import Footer from './Footer';
import { WHATSAPP_LINK } from '../constants/business';
const CustomerLayout = () => {
  return (
    <>
      <Navbar />
      <main className="site-main" id="main-content">
        <Outlet />
      </main>
      <Footer />
      <a
        className="floating-whatsapp"
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        title="Chat with us on WhatsApp"
      >
        <FaWhatsapp aria-hidden="true" />
      </a>
    </>
  );
};

export default CustomerLayout;
