import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

export default function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Confirmation",
  description = "This action cannot be undone.",
  loading = false,
}) {
  const [inputValue, setInputValue] = useState("");
  const isConfirmed = inputValue === "DELETE";

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 pt-4">
        <div className="flex items-start gap-3 p-3 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Warning</p>
            <p className="text-red-600/90 dark:text-red-400">{description}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">
            Type <span className="font-bold text-red-600">DELETE</span> to
            confirm
          </Label>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="DELETE"
            className="border-red-200 focus-visible:ring-red-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!isConfirmed || loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Forever"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
