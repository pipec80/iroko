import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing-config';

export { routing };
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
