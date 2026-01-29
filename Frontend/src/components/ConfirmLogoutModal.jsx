import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export default function ConfirmLogoutModal({ isOpen, onClose, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Logout">
      <div className="py-4">
        <p className="text-sm text-muted-foreground">
          Are you sure you want to log out of the admin console?
        </p>
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Logout
        </Button>
      </div>
    </Modal>
  );
}
