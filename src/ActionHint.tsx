import { Tooltip } from '@heroui/react'
import type { ReactElement } from 'react'

type ActionHintProps = {
  label: string
  children: ReactElement
}

export default function ActionHint({ label, children }: ActionHintProps) {
  return (
    <Tooltip delay={400}>
      {children}
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  )
}
