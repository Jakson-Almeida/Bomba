import {
  Outlet,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { BenchProvider } from "./context/BenchContext";
import { IndexPage } from "./pages/IndexPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PumpPage } from "./pages/PumpPage";

const rootRoute = createRootRoute({
  component: function RootLayout() {
    return (
      <BenchProvider>
        <Outlet />
      </BenchProvider>
    );
  },
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

const pumpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bomba/$id",
  component: PumpPage,
});

const routeTree = rootRoute.addChildren([indexRoute, pumpRoute]);

const history = createHashHistory();

export const router = createRouter({ routeTree, history });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
