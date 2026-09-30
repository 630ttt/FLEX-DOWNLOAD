import './CataloguePagination.css';

const getPageNumbers = (page, totalPages) => {
  const pages = [];
  const window = 1;
  for (let p = 1; p <= totalPages; p += 1) {
    if (p === 1 || p === totalPages || (p >= page - window && p <= page + window)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return pages;
};

const CataloguePagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="catalogue-pagination">
      <button className="catalogue-pagination-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        &lsaquo;
      </button>
      {pages.map((p, index) =>
        p === '...' ? (
          <span key={`ellipsis-${index}`} className="catalogue-pagination-ellipsis">
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`catalogue-pagination-btn${p === page ? ' catalogue-pagination-btn-active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button className="catalogue-pagination-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        &rsaquo;
      </button>
    </div>
  );
};

export default CataloguePagination;
