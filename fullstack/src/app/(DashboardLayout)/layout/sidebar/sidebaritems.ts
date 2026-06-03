import { uniqueId } from 'lodash'

export interface ChildItem {
  id?: number | string
  name?: string
  icon?: string
  children?: ChildItem[]
  item?: unknown
  url?: string
  color?: string
  disabled?: boolean
  subtitle?: string
  badge?: boolean
  badgeType?: string
  isPro?: boolean
}

export interface MenuItem {
  heading?: string
  name?: string
  icon?: string
  id?: number | string
  to?: string
  items?: MenuItem[]
  children?: ChildItem[]
  url?: string
  disabled?: boolean
  subtitle?: string
  badgeType?: string
  badge?: boolean
  isPro?: boolean
}

export function getSidebarContent(role?: string): MenuItem[] {
  if (role === 'admin') {
    return [
      {
        heading: 'Admin',
        children: [
          {
            name: 'Dashboard',
            icon: 'solar:chart-square-linear',
            id: uniqueId(),
            url: '/admin/dashboard',
          },
          {
            name: 'User',
            icon: 'solar:user-circle-linear',
            id: uniqueId(),
            url: '/admin/users',
          },
          {
            name: 'Kredit',
            icon: 'solar:wallet-money-linear',
            id: uniqueId(),
            url: '/admin/credits',
          },
          {
            name: 'Jobs',
            icon: 'solar:document-add-linear',
            id: uniqueId(),
            url: '/admin/jobs',
          },
          {
            name: 'Audit Log',
            icon: 'solar:shield-check-linear',
            id: uniqueId(),
            url: '/admin/audit-logs',
          },
        ],
      },
    ]
  }

  return [
    {
      heading: 'Guru',
      children: [
        {
          name: 'Assessment',
          icon: 'solar:clipboard-list-linear',
          id: uniqueId(),
          url: '/assessments',
        },
        {
          name: 'Jobs',
          icon: 'solar:document-add-linear',
          id: uniqueId(),
          url: '/jobs',
        },
        {
          name: 'Kredit',
          icon: 'solar:wallet-money-linear',
          id: uniqueId(),
          url: '/credits',
        },
      ],
    },
  ]
}

const SidebarContent = getSidebarContent('guru')

export default SidebarContent
