import { HairlineLink } from '@/components/ui/HairlineLink'
import { brand } from '@/config/brand'
import { cx } from '@/lib/cx'

const { instagram, pinterest } = brand.social

const links = [
  {
    text: instagram.label,
    href: instagram.url,
    label: `${instagram.label}, ${instagram.handle}, opens in a new tab`,
    newTab: true,
  },
  {
    text: pinterest.label,
    href: pinterest.url,
    label: `${pinterest.label}, ${pinterest.handle}, opens in a new tab`,
    newTab: true,
  },
  {
    text: 'Email',
    href: `mailto:${brand.email}`,
    label: `Email ${brand.email}`,
    newTab: false,
  },
]

interface SocialLinksProps {
  className?: string
}

export function SocialLinks({ className }: SocialLinksProps) {
  return (
    <ul className={cx('flex', className)}>
      {links.map((link) => (
        <li key={link.text}>
          <HairlineLink href={link.href} label={link.label} newTab={link.newTab}>
            {link.text}
          </HairlineLink>
        </li>
      ))}
    </ul>
  )
}
