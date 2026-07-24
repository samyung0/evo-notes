import { toast as sonnerToast } from 'sonner';
import { Toast, type ToastProps } from './Sonner';

export function userToast(toast: Omit<ToastProps, 'id'>) {
  return sonnerToast.custom((id) => <Toast {...toast} id={id} />);
}
