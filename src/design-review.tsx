import { createRoot } from 'react-dom/client'
import { DesignReview } from './DesignReview'

if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<DesignReview />)
