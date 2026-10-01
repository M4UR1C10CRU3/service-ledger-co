import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          /* Campo escuro, com o foco na cor do vertical — é o anel de foco que
             diz onde se está a escrever, por isso é ali que a cor faz falta.
             Tirou-se o `ring-offset`, que abria um halo claro à volta do campo
             sobre fundo escuro. */
          "flex h-10 w-full rounded-[8px] border border-input bg-popover px-3 py-2 text-base",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/70 transition-colors hover:border-border",
          "focus-visible:outline-none focus-visible:border-vertical focus-visible:ring-2 focus-visible:ring-vertical-soft",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
