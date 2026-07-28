import { useEffect } from "react";

/* Trava o scroll do body enquanto o componente estiver montado. Usado por
   todo modal/bottom-sheet do app: sem isso, no mobile o gesto de rolar o
   conteúdo do modal por vezes rola o conteúdo por trás dele também (o
   overlay cobre a tela, mas o body continua "scrollável"), o que confunde
   e obriga o usuário a rolar/dar zoom para reencontrar o que estava vendo. */
export function useLockBodyScroll() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
}
