import copasa from "../assets/copasa.png";
import ufjf from "../assets/ufjf.png";

export function BrandFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-panel/80 px-5 py-4 backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={ufjf}
            alt="Universidade Federal de Juiz de Fora"
            className="h-11 w-auto object-contain"
          />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground">
              Laboratório Litel
            </p>
            <p className="text-[11px] text-muted-foreground">
              Universidade Federal de Juiz de Fora
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <p className="text-[11px] leading-tight text-muted-foreground sm:max-w-[14rem] sm:text-right">
            Software da bancada para o projeto com a
          </p>
          <img
            src={copasa}
            alt="Copasa"
            className="h-8 w-auto shrink-0 object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
