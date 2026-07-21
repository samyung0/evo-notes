import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app/AppShell';
import { AuthGate } from '@/components/app/AuthProvider';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from 'sonner';
import { features } from '@/lib/features';
import { USE_MSW } from '@/api/auth';
import { queryClient } from '@/api/queryClient';
import {
  allFilesQuery,
  attemptQuery,
  attemptsQuery,
  canvasesQuery,
  canvasQuery,
  cardsQuery,
  chaptersQuery,
  conversationsQuery,
  decksQuery,
  deckQuery,
  eventsQuery,
  exploreQuizzesQuery,
  exploreDecksQuery,
  exploreWorkspacesQuery,
  filesQuery,
  labelsQuery,
  meQuery,
  quizQuery,
  quizzesQuery,
  tasksQuery,
  workspaceQuery,
  workspacesQuery,
  materialsQuery,
} from '@/api/hooks';
import { parseWorkspaceOpenSearch } from '@/features/materials/openItem';

interface RouterContext {
  queryClient: QueryClient;
}

/** Loader helper: prime the React Query cache during route preload (on intent),
 * so the component's `useQuery` hits a warm cache on mount instead of firing
 * the request only after render. Returns void so loaders never contribute
 * `loaderData` (the components still read via `useQuery`). */
type Loader = (args: { context: RouterContext; params: Record<string, string> }) => void;

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      <Toaster />
      <TanStackRouterDevtools />
    </>
  ),
});

const authShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth-shell',
  component: () => (
    <AuthGate>
      <AppShell />
    </AuthGate>
  ),
});

const page = <const T extends string>(
  path: T,
  importer: () => Promise<{ default: React.ComponentType }>,
  loader?: Loader
) =>
  createRoute({
    getParentRoute: () => authShellRoute,
    path,
    component: lazyRouteComponent(importer),
    ...(loader ? { loader } : {}),
  });

const publicRoutes = [
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/share/workspaces/$workspaceId',
    component: lazyRouteComponent(() => import('@/routes/WorkspaceOpen')),
    validateSearch: parseWorkspaceOpenSearch,
    loader: ({ context: { queryClient: qc }, params }) => {
      const id = params.workspaceId;
      qc.prefetchQuery(workspaceQuery(id));
      qc.prefetchQuery(chaptersQuery(id));
      qc.prefetchQuery(filesQuery(id));
      qc.prefetchQuery(materialsQuery(id));
    },
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/share/quizzes/$quizId',
    component: lazyRouteComponent(() => import('@/routes/QuizAttempt')),
    loader: ({ context: { queryClient: qc }, params }) =>
      qc.prefetchQuery(quizQuery(params.quizId)),
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/share/decks/$deckId',
    component: lazyRouteComponent(() => import('@/routes/DeckStudy')),
    loader: ({ context: { queryClient: qc }, params }) => {
      qc.prefetchQuery(deckQuery(params.deckId));
      qc.prefetchQuery(cardsQuery(params.deckId));
    },
  }),
  ...(USE_MSW
    ? []
    : [
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/sign-in',
          component: lazyRouteComponent(() => import('@/routes/SignIn')),
        }),
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/sign-up',
          component: lazyRouteComponent(() => import('@/routes/SignUp')),
        }),
      ]),
];

const appRoutes = [
  createRoute({
    getParentRoute: () => authShellRoute,
    path: '/',
    component: lazyRouteComponent(() => import('@/routes/Dashboard')),
    loader: ({ context: { queryClient: qc } }) => {
      qc.prefetchQuery(meQuery());
      qc.prefetchQuery(workspacesQuery({ sort: 'accessed' }));
      qc.prefetchQuery(tasksQuery());
      qc.prefetchQuery(canvasesQuery());
    },
  }),
  page(
    '/workspaces',
    () => import('@/routes/Workspaces'),
    ({ context: { queryClient: qc } }) =>
      qc.prefetchQuery(workspacesQuery({ sort: 'accessed', q: '', color: undefined }))
  ),
  createRoute({
    getParentRoute: () => authShellRoute,
    path: '/workspaces/$workspaceId',
    component: lazyRouteComponent(() => import('@/routes/WorkspaceOpen')),
    validateSearch: parseWorkspaceOpenSearch,
    loader: ({ context: { queryClient: qc }, params }) => {
      const id = params.workspaceId;
      qc.prefetchQuery(workspaceQuery(id));
      qc.prefetchQuery(chaptersQuery(id));
      qc.prefetchQuery(filesQuery(id));
      qc.prefetchQuery(materialsQuery(id));
      qc.prefetchQuery(conversationsQuery(id));
    },
  }),
  page('/workspace-invites/$token', () => import('@/routes/WorkspaceInviteAccept')),
  page(
    '/quizzes',
    () => import('@/routes/Quizzes'),
    ({ context: { queryClient: qc } }) => {
      qc.prefetchQuery(quizzesQuery());
      qc.prefetchQuery(attemptsQuery());
    }
  ),
  page(
    '/quizzes/$quizId/attempt',
    () => import('@/routes/QuizAttempt'),
    ({ context: { queryClient: qc }, params }) => qc.prefetchQuery(quizQuery(params.quizId))
  ),
  page(
    '/quizzes/$quizId/edit',
    () => import('@/routes/QuizEdit'),
    ({ context: { queryClient: qc }, params }) => qc.prefetchQuery(quizQuery(params.quizId))
  ),
  page(
    '/quizzes/attempts/$attemptId',
    () => import('@/routes/AttemptResult'),
    ({ context: { queryClient: qc }, params }) => qc.prefetchQuery(attemptQuery(params.attemptId))
  ),
  createRoute({
    getParentRoute: () => authShellRoute,
    path: '/schedule',
    component: lazyRouteComponent(() => import('@/routes/Schedule')),
    validateSearch: (search: Record<string, unknown>): { event?: string } => ({
      event: typeof search.event === 'string' ? search.event : undefined,
    }),
    loader: ({ context: { queryClient: qc } }) => {
      qc.prefetchQuery(eventsQuery());
      qc.prefetchQuery(labelsQuery());
    },
  }),
  page(
    '/flashcards',
    () => import('@/routes/Flashcards'),
    ({ context: { queryClient: qc } }) => qc.prefetchQuery(decksQuery())
  ),
  page(
    '/flashcards/$deckId',
    () => import('@/routes/DeckStudy'),
    ({ context: { queryClient: qc }, params }) => {
      qc.prefetchQuery(deckQuery(params.deckId));
      qc.prefetchQuery(cardsQuery(params.deckId));
    }
  ),
  page(
    '/files',
    () => import('@/routes/Files'),
    ({ context: { queryClient: qc } }) => qc.prefetchQuery(allFilesQuery())
  ),
  page(
    '/tasks',
    () => import('@/routes/Tasks'),
    ({ context: { queryClient: qc } }) => qc.prefetchQuery(tasksQuery())
  ),
  ...(features.thinking
    ? [
        page(
          '/thinking',
          () => import('@/routes/Thinking'),
          ({ context: { queryClient: qc } }) => qc.prefetchQuery(canvasesQuery())
        ),
        page(
          '/thinking/$canvasId',
          () => import('@/routes/Canvas'),
          ({ context: { queryClient: qc }, params }) =>
            qc.prefetchQuery(canvasQuery(params.canvasId))
        ),
      ]
    : []),
  ...(features.explore
    ? [
        page(
          '/explore',
          () => import('@/routes/Explore'),
          ({ context: { queryClient: qc } }) => {
            qc.prefetchQuery(exploreWorkspacesQuery());
            qc.prefetchQuery(exploreQuizzesQuery());
            qc.prefetchQuery(exploreDecksQuery());
          }
        ),
      ]
    : []),
  page('/support', () => import('@/routes/Support')),
  page('/settings', () => import('@/routes/Settings')),
  page('/profile', () => import('@/routes/Profile')),
  page(
    '/subscription',
    () => import('@/routes/Subscription'),
    ({ context: { queryClient: qc } }) => qc.prefetchQuery(meQuery())
  ),
];

const routeTree = rootRoute.addChildren([...publicRoutes, authShellRoute.addChildren(appRoutes)]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  context: { queryClient },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
