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
      {toasts.map(function ({
        id,
        title,
        description,
        mobileTitle,
        notificationLayout,
        action,
        onToastClick,
        className,
        ...props
      }) {
        const isOwnerAlert = notificationLayout === "owner-alert"
        const handleContentClick = onToastClick
          ? (event: MouseEvent<HTMLDivElement>) => {
              const target = event.target as HTMLElement
              if (target.closest("[data-toast-action]") || target.closest("[toast-close]")) return
              onToastClick()
            }
          : undefined

        return (
          <Toast
            key={id}
            className={cn(
              className,
              isOwnerAlert && "max-sm:items-start max-sm:py-2.5",
            )}
            {...props}
          >
            <div
              className={cn("grid gap-0.5 sm:gap-1 flex-1 min-w-0", onToastClick && "cursor-pointer")}
              onClick={handleContentClick}
            >
              {isOwnerAlert && mobileTitle ? (
                <ToastTitle className="sm:hidden text-xs font-medium leading-snug line-clamp-2">
                  {mobileTitle}
                </ToastTitle>
              ) : null}
              {title ? (
                <ToastTitle
                  className={cn(isOwnerAlert && mobileTitle && "hidden sm:block")}
                >
                  {title}
                </ToastTitle>
              ) : null}
              {description ? (
                <ToastDescription
                  className={cn(
                    onToastClick && "whitespace-pre-line",
                    isOwnerAlert && "hidden sm:block",
                  )}
                >
                  {description}
                </ToastDescription>
              ) : null}
            </div>
            {action ? (
              <div className={cn(isOwnerAlert && "hidden sm:contents")}>{action}</div>
            ) : null}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
