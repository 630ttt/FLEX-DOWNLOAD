import { Navigate, useParams } from 'react-router-dom';

export const RedirectCustomizeToEditor = () => <Navigate to="/editor" replace />;

export const RedirectTemplateCustomizeToEditor = () => {
  const { id } = useParams();
  return <Navigate to={`/editor/template/${id}`} replace />;
};
