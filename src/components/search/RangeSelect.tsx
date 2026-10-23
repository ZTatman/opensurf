import { RANGE_MILES } from '../../lib/geo'
import OptionSelect from '../ui/OptionSelect'

type RangeSelectProps = {
  miles: number
  onChange: (miles: number) => void
}

export default function RangeSelect({ miles, onChange }: RangeSelectProps) {
  return (
    <OptionSelect className="w-36" triggerClassName="h-10" label="Nearby range" hideLabel value={String(miles)}
      options={RANGE_MILES.map(value => ({ id: String(value), label: `Within ${value} mi` }))}
      onChange={value => onChange(Number(value))} />
  )
}
