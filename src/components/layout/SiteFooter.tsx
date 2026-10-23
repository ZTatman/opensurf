import { Link } from '@heroui/react'
import { Fragment } from 'react'
import { beachIndexSource, sources } from '../../cameras'

const footerLink = 'text-xs text-muted'

export default function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-7xl flex-wrap gap-x-3 gap-y-1 px-4 py-6 text-xs text-muted sm:px-8">
      <span>Public cameras from {sources.map((source, index) => (
        <Fragment key={source.id}>
          {index === 0 ? '' : index === sources.length - 1 ? ' and ' : ', '}
          <Link className={footerLink} href={source.homepage} target="_blank" rel="noopener noreferrer">{source.name}</Link>
        </Fragment>
      ))}.</span>
      {sources.filter(source => source.terms).map(source => (
        <Link key={source.id} className={footerLink} href={source.terms} target="_blank" rel="noopener noreferrer">
          {source.name} terms
        </Link>
      ))}
      <span>Beach locations: <Link className={footerLink} href={beachIndexSource.homepage} target="_blank" rel="noopener noreferrer">{beachIndexSource.name}</Link> BEACH Act data.</span>
      <span>Places: <Link className={footerLink} href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noopener noreferrer">GeoNames via Open-Meteo</Link>.</span>
      <span>Locations and distances are approximate.</span>
      <span>Search covers the listed sources. Some cameras open on the operator’s site. Availability varies; images may be cached or location photos.</span>
    </footer>
  )
}
