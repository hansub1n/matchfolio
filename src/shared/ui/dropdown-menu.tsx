"use client"

import * as React from "react"
import { cn } from "cn"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[8rem] max-sm:min-w-[11rem] overflow-hidden rounded-xl bg-popover p-1 text-sm text-popover-foreground shadow-[0_8px_16px_rgb(0_0_0_/_0.08),0_24px_48px_rgb(0_0_0_/_0.16)] ring-1 ring-black/[0.06] duration-100 outline-none dark:ring-white/[0.08] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </DropdownMenuPortal>
  )
}

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        // 항목은 13px, 아이콘은 회색. 휴대폰에선 손가락으로 누르기 좋게 한 단계 크게(높이 44px, 15px, 아이콘 16px). 삭제(destructive)는 글자·아이콘 색만 빨강이고 hover 배경은 다른 항목과 같다.
        "relative flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] max-sm:min-h-11 max-sm:gap-2.5 max-sm:px-3 max-sm:text-[15px] max-sm:[&_svg]:size-4 outline-none select-none hover:bg-muted focus:bg-muted [&_svg]:text-muted-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:[&_svg]:text-destructive",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
}
