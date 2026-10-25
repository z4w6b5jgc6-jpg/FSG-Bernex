import { useDark } from '../lib/theme'

/** Logo du club, version claire ou sombre selon le thème choisi */
export function Logo({ kind, className, alt = '' }: { kind: 'club' | 'symbol'; className?: string; alt?: string }) {
  const dark = useDark()
  const base = kind === 'club' ? 'logo-club' : 'logo-symbol'
  return <img src={`${base}${dark ? '-dark' : ''}.png`} alt={alt || (kind === 'club' ? 'FSG Bernex-Confignon' : '')} className={className} />
}
