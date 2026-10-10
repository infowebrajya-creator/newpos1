import { useNavigate, useLocation, Link as ReactRouterLink } from 'react-router-dom';
import React from 'react';

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    back: () => navigate(-1),
    refresh: () => {},
    prefetch: (_path?: string) => {},
  };
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function Link({ href, children, ...props }: any) {
  return (
    <ReactRouterLink to={href || props.to} {...props}>
      {children}
    </ReactRouterLink>
  );
}

export function redirect(path: string) {
  window.location.href = path;
}
