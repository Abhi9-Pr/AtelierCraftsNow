import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Catalog } from '@/pages/Catalog'
import { Custom } from '@/pages/Custom'
import { Design } from '@/pages/Design'
import { Home } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound'
import { Privacy } from '@/pages/Privacy'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="collection" element={<Catalog />} />
        <Route path="custom" element={<Custom />} />
        <Route path="design/:id" element={<Design />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
