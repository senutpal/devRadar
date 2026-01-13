import { cn } from '@/lib/utils';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'main';
  size?: 'default' | 'sm' | 'lg' | 'full';
}

const sizeClasses = {
  sm: 'max-w-4xl',
  default: 'max-w-6xl',
  lg: 'max-w-7xl',
  full: 'max-w-full',
};

export function Container({
  children,
  className,
  as: Component = 'div',
  size = 'default',
}: ContainerProps) {
  return (
    <Component className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClasses[size], className)}>
      {children}
    </Component>
  );
}
