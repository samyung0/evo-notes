import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { AppShell } from '@/components/app/AppShell';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const rootRoute = createRootRoute({
  component: () => (
    <>
      <AppShell />
      <TanStackRouterDevtools />
    </>
  ),
});

const page = <const T extends string>(
  path: T,
  importer: () => Promise<{ default: React.ComponentType }>
) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: lazyRouteComponent(importer),
  });

const routes = [
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: lazyRouteComponent(() => import('@/routes/Dashboard')),
  }),
  page('/workspaces', () => import('@/routes/Workspaces')),
  page('/workspaces/$workspaceId', () => import('@/routes/WorkspaceOpen')),
  page('/quizzes', () => import('@/routes/Quizzes')),
  page('/quizzes/$quizId/attempt', () => import('@/routes/QuizAttempt')),
  page('/schedule', () => import('@/routes/Schedule')),
  page('/flashcards', () => import('@/routes/Flashcards')),
  page('/flashcards/$deckId', () => import('@/routes/DeckStudy')),
  page('/files', () => import('@/routes/Files')),
  page('/tasks', () => import('@/routes/Tasks')),
  page('/thinking', () => import('@/routes/Thinking')),
  page('/thinking/$canvasId', () => import('@/routes/Canvas')),
  page('/explore', () => import('@/routes/Explore')),
  page('/support', () => import('@/routes/Support')),
  page('/settings', () => import('@/routes/Settings')),
  page('/profile', () => import('@/routes/Profile')),
];

const routeTree = rootRoute.addChildren(routes);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
