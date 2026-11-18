import { useThemeContext } from '../../hooks/use-theme-context';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const importantThemeClassesOverSonnerUnlayeredStyles = {
  toast:
    'group toast group-[.toaster]:bg-background! group-[.toaster]:text-foreground! group-[.toaster]:border-border! group-[.toaster]:shadow-lg!',
  description: 'group-[.toast]:text-muted-foreground!',
  actionButton:
    'group-[.toast]:bg-primary! group-[.toast]:text-primary-foreground!',
  cancelButton:
    'group-[.toast]:bg-muted! group-[.toast]:text-muted-foreground!',
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useThemeContext();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: importantThemeClassesOverSonnerUnlayeredStyles,
      }}
      {...props}
    />
  );
};

export { Toaster };
