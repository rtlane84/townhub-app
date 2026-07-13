"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-2 [--cell-size:2.5rem] sm:p-3 [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn(defaultClassNames.root, "w-full"),
        months: cn(defaultClassNames.months, "relative flex w-full flex-col"),
        month: cn(defaultClassNames.month, "flex w-full shrink-0 flex-col gap-2"),
        nav: cn(
          defaultClassNames.nav,
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          defaultClassNames.button_previous,
          "size-9 select-none rounded-full p-0 aria-disabled:opacity-50",
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          defaultClassNames.button_next,
          "size-9 select-none rounded-full p-0 aria-disabled:opacity-50",
        ),
        month_caption: cn(
          defaultClassNames.month_caption,
          "flex h-9 w-full shrink-0 items-center justify-center px-10",
        ),
        dropdowns: cn(
          defaultClassNames.dropdowns,
          "flex h-9 w-full items-center justify-center gap-1.5 text-sm font-medium",
        ),
        dropdown_root: cn(
          defaultClassNames.dropdown_root,
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
        ),
        dropdown: cn(defaultClassNames.dropdown, "bg-popover absolute inset-0 opacity-0"),
        caption_label: cn(
          defaultClassNames.caption_label,
          "select-none text-sm font-semibold tracking-tight text-platform-heading",
          captionLayout !== "label" &&
            "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 [&>svg]:size-3.5",
        ),
        table: "w-full border-collapse",
        weekdays: cn(defaultClassNames.weekdays, "mb-1 flex w-full shrink-0"),
        weekday: cn(
          defaultClassNames.weekday,
          "text-muted-foreground flex-1 select-none rounded-md text-[0.7rem] font-medium uppercase tracking-wide",
        ),
        week: cn(defaultClassNames.week, "mt-0.5 flex w-full shrink-0"),
        week_number_header: cn(
          defaultClassNames.week_number_header,
          "w-[--cell-size] select-none",
        ),
        week_number: cn(
          defaultClassNames.week_number,
          "text-muted-foreground select-none text-[0.8rem]",
        ),
        day: cn(
          defaultClassNames.day,
          "group/day relative flex size-[--cell-size] flex-1 select-none items-center justify-center p-0 text-center",
        ),
        range_start: cn(defaultClassNames.range_start, "bg-accent rounded-l-full"),
        range_middle: cn(defaultClassNames.range_middle, "rounded-none"),
        range_end: cn(defaultClassNames.range_end, "bg-accent rounded-r-full"),
        today: cn(
          defaultClassNames.today,
          "text-foreground [&_button]:ring-1 [&_button]:ring-primary/35",
        ),
        outside: cn(
          defaultClassNames.outside,
          "text-muted-foreground/55 aria-selected:text-muted-foreground",
        ),
        disabled: cn(defaultClassNames.disabled, "text-muted-foreground opacity-50"),
        hidden: cn(defaultClassNames.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        defaultClassNames.day,
        "flex size-9 min-h-0 min-w-0 items-center justify-center rounded-full p-0 text-sm font-medium leading-none shadow-none hover:bg-muted focus-visible:ring-1",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-primary",
        "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-middle=true]:rounded-none",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-start=true]:rounded-full",
        "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-end=true]:rounded-full",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-ring/40",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
