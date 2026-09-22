// Tremor Card [v1.0.0]

import React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cx } from "../../utils/cx"

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div"
    return (
      <Component
        ref={forwardedRef}
        className={cx(
          // base
          "relative w-full rounded-xl border p-6 text-left shadow-xs",
          // background color — más clara que el fondo de página para que la
          // card "flote" de verdad (el default de Tremor es casi idéntico al
          // fondo y se pierde el efecto de elevación).
          "bg-white dark:bg-gray-900",
          // border color
          "border-gray-200 dark:border-gray-800",
          // elevación real
          "shadow-lg shadow-black/20 dark:shadow-black/40",
          className,
        )}
        tremor-id="tremor-raw"
        {...props}
      />
    )
  },
)

Card.displayName = "Card"

export { Card, type CardProps }
