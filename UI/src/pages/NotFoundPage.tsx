import { Link } from "@tanstack/react-router";
import { AppShell } from "../components/AppShell";

export function NotFoundPage() {
  return (
    <AppShell>
      <div className="grid flex-1 place-items-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Página não encontrada
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Essa rota não existe neste painel.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Voltar ao painel
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
