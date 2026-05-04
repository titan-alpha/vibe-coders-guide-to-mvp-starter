export const ROUTES = [
  { path: '/',          name: 'home',      auth: false },
  { path: '/about',     name: 'about',     auth: false },
  { path: '/faq',       name: 'faq',       auth: false },
  { path: '/status',    name: 'status',    auth: false },
  { path: '/press',     name: 'press',     auth: false },
  { path: '/changelog', name: 'changelog', auth: false },
] as const;

export type Route = (typeof ROUTES)[number];
