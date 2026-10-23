import { Button, ToggleButton } from '@heroui/react'
import type { ComponentProps, ReactNode } from 'react'
import ActionHint from './ActionHint'

// Icon-only controls always carry a tooltip that matches their accessible name.
type IconButtonProps = Omit<ComponentProps<typeof Button>, 'children' | 'aria-label' | 'isIconOnly'> & {
  label: string
  children: ReactNode
}

export function IconButton({ label, className = '', variant = 'ghost', children, ...props }: IconButtonProps) {
  return (
    <ActionHint label={label}>
      <Button className={`size-11 min-w-11 ${className}`} variant={variant} isIconOnly aria-label={label} {...props}>
        {children}
      </Button>
    </ActionHint>
  )
}

type IconToggleProps = Omit<ComponentProps<typeof ToggleButton>, 'children' | 'aria-label' | 'isIconOnly'> & {
  label: string
  children: ReactNode
}

export function IconToggle({ label, className = '', variant = 'ghost', children, ...props }: IconToggleProps) {
  return (
    <ActionHint label={label}>
      <ToggleButton className={`size-11 min-w-11 ${className}`} variant={variant} isIconOnly aria-label={label} {...props}>
        {children}
      </ToggleButton>
    </ActionHint>
  )
}
