
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaImages,
  FaTag,
  FaRupeeSign,
  FaArrowRight,
} from 'react-icons/fa';
import { api } from '../../api/client';
import Pagination from '../../components/Pagination';
import Loader from '../../components/Loader';
import DesignPreviewImage from '../../components/DesignPreviewImage';
import './AdminTable.css';

const AdminDesigns = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [designs, setDesigns] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get('page'), 10) || 1;

  const loadDesigns = () => {
    setLoading(true);

    api
      .get('/admin/designs', {
        page,
        limit: 20,
      })
      .then((res) => {
        setDesigns(res.data);
        setPagination(res.pagination);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadDesigns, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this design?')) return;

    await api.del(`/admin/designs/${id}`);

    loadDesigns();
  };

  return (
    <div className="admin-designs-page">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="admin-page-header designs-page-header">

        <div className="designs-heading">

          <span className="designs-eyebrow">
            CATALOGUE MANAGEMENT
          </span>

          <h1 className="section-title">
            Designs
          </h1>

          <p className="section-subtitle">
            Manage your flex printing designs, categories and pricing.
          </p>

        </div>

        <Link
          to="/admin/designs/add"
          className="btn btn-primary designs-add-btn"
        >
          <FaPlus />
          <span>Add Design</span>
        </Link>

      </div>


      {/* =====================================================
          SUMMARY STRIP
          ===================================================== */}

      {!loading && (
        <div className="designs-summary">

          <div className="designs-summary-card">

            <div className="designs-summary-icon blue">
              <FaImages />
            </div>

            <div>
              <span>Total Designs</span>

              <strong>
                {pagination.total ?? designs.length}
              </strong>
            </div>

          </div>


          <div className="designs-summary-card">

            <div className="designs-summary-icon yellow">
              <FaTag />
            </div>

            <div>
              <span>Current Page</span>

              <strong>
                {pagination.page || page}
              </strong>
            </div>

          </div>


          <div className="designs-summary-card">

            <div className="designs-summary-icon navy">
              <FaArrowRight />
            </div>

            <div>
              <span>Page Size</span>

              <strong>
                {designs.length}
              </strong>
            </div>

          </div>

        </div>
      )}


      {/* =====================================================
          TABLE
          ===================================================== */}

      {loading ? (
        <div className="admin-designs-loader">
          <Loader />
        </div>
      ) : (
        <>

          <div className="admin-table-wrapper admin-designs-table-card">

            <div className="admin-table-topbar">

              <div>
                <h2>
                  Design Catalogue
                </h2>

                <p>
                  All available printing designs
                </p>
              </div>

              <div className="designs-count-badge">
                {designs.length} shown
              </div>

            </div>


            {designs.length > 0 ? (
              <div className="admin-table-scroll">

                <table className="admin-table">

                  <thead>
                    <tr>
                      <th>Design</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>


                  <tbody>

                    {designs.map((design) => (

                      <tr key={design._id}>

                        {/* DESIGN IMAGE */}

                        <td data-label="Design">

                          <div className="admin-design-preview">

                            <div className="admin-design-image-wrap">

                              <DesignPreviewImage
                                design={design}
                                alt={design.title}
                                className="admin-table-thumb"
                              />

                            </div>

                          </div>

                        </td>


                        {/* TITLE */}

                        <td data-label="Title">

                          <div className="admin-design-title-cell">

                            <strong>
                              {design.title}
                            </strong>

                            <span>
                              ID: {design._id?.slice(-8)}
                            </span>

                          </div>

                        </td>


                        {/* CATEGORY */}

                        <td data-label="Category">

                          <span className="design-category-badge">

                            <FaTag />

                            {design.category?.name || 'Uncategorized'}

                          </span>

                        </td>


                        {/* PRICE */}

                        <td data-label="Price">

                          <div className="design-price">

                            <span className="design-price-icon">
                              <FaRupeeSign />
                            </span>

                            <strong>
                              {design.price || 0}
                            </strong>

                          </div>

                        </td>


                        {/* ACTIONS */}

                        <td data-label="Actions">

                          <div className="admin-table-actions">

                            <Link
                              to={`/admin/designs/edit/${design._id}`}
                              className="admin-action-btn admin-edit-btn"
                              title="Edit Design"
                              aria-label={`Edit ${design.title}`}
                            >
                              <FaEdit />
                            </Link>


                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(design._id)
                              }
                              className="admin-action-btn admin-delete-btn"
                              title="Delete Design"
                              aria-label={`Delete ${design.title}`}
                            >
                              <FaTrash />
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>
            ) : (

              <div className="empty-state admin-designs-empty">

                <div className="admin-empty-icon">
                  <FaImages />
                </div>

                <h3>
                  No designs yet
                </h3>

                <p>
                  Start building your catalogue by adding your first
                  flex printing design.
                </p>

                <Link
                  to="/admin/designs/add"
                  className="btn btn-primary"
                >
                  <FaPlus />
                  Add Your First Design
                </Link>

              </div>

            )}

          </div>


          {/* =================================================
              PAGINATION
              ================================================= */}

          {designs.length > 0 && (
            <div className="admin-designs-pagination">

              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) =>
                  setSearchParams({ page: newPage })
                }
              />

            </div>
          )}

        </>
      )}

    </div>
  );
};

export default AdminDesigns;

