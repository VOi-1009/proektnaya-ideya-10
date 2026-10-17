import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminUser } from "@/lib/users";

interface Props {
  toDelete: AdminUser | null;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteUserDialog = ({ toDelete, onCancel, onConfirm }: Props) => (
  <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && onCancel()}>
    <AlertDialogContent className="bg-card border-border">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-white">Удалить «{toDelete?.name}»?</AlertDialogTitle>
        <AlertDialogDescription>
          {toDelete?.isBot
            ? "Бот пропадёт из списка «В сети»."
            : "Аккаунт, портфель, оценки новостей и история посещений будут удалены без возможности восстановления. Статьи останутся на сайте."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="bg-transparent border-input hover:bg-hover hover:text-white">Отмена</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-down text-white hover:bg-down/90">
          Удалить
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DeleteUserDialog;
