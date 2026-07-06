import { useToast } from "@/hooks/use-toast"
import type { MouseEvent } from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, onToastClick, className, ...props }) {
        const handleContentClick = onToastClick
          ? (event: MouseEvent<HTMLDivElement>) => {
              const target = event.target as HTMLElement
              if (target.closest("[data-toast-action]") || target.closest("[toast-close]")) return
              onToastClick()
            }
          : undefined

        return (
          <Toast key={id} className={className} {...props}>
            <div
              className={cn("grid gap-1 flex-1", onToastClick && "cursor-pointer")}
              onClick={handleContentClick}
            >
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription className={onToastClick ? "whitespace-pre-line" : undefined}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
