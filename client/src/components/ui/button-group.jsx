import * as React from "react"
import { cn } from "../../lib/utils"

const ButtonGroup = React.forwardRef(({ className, orientation = "horizontal", ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="group"
      data-orientation={orientation}
      className={cn(
        "inline-flex items-center",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        "[&>button]:rounded-none",
        "[&>button:first-child]:rounded-l-md",
        "[&>button:last-child]:rounded-r-md",
        "[&>button:not(:first-child)]:border-l-0",
        orientation === "vertical" && [
          "[&>button:first-child]:rounded-t-md",
          "[&>button:first-child]:rounded-b-none",
          "[&>button:last-child]:rounded-b-md",
          "[&>button:last-child]:rounded-t-none",
          "[&>button:not(:first-child)]:border-t-0",
          "[&>button:not(:first-child)]:border-l",
        ],
        className
      )}
      {...props}
    />
  )
})
ButtonGroup.displayName = "ButtonGroup"

const ButtonGroupSeparator = React.forwardRef(({ className, orientation = "horizontal", ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="separator"
      data-orientation={orientation}
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "h-full w-px" : "h-px w-full",
        className
      )}
      {...props}
    />
  )
})
ButtonGroupSeparator.displayName = "ButtonGroupSeparator"

const ButtonGroupText = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn("px-3 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
ButtonGroupText.displayName = "ButtonGroupText"

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText }
