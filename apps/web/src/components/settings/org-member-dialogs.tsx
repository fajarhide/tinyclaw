import type { OrgMemberSummary, OrgRole } from "@nakama/core/contract";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OrgMemberRoleSelect } from "@/components/settings/org-member-role-select";

export type OrgMemberAddCredentials = {
  email: string;
  temporaryPassword: string;
};

export function OrgMemberInviteDialog({
  open,
  inviteEmail,
  inviteRole,
  formError,
  pending,
  onOpenChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onSubmit,
}: {
  open: boolean;
  inviteEmail: string;
  inviteRole: OrgRole;
  formError: string | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (role: OrgRole) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => onInviteEmailChange(event.target.value)}
              placeholder="colleague@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="mb-1 block text-sm font-medium">
              Role
            </label>
            <OrgMemberRoleSelect value={inviteRole} onChange={onInviteRoleChange} />
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs">
          {value}
        </code>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={onCopy}
        >
          <CopyIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function OrgMemberAddDialog({
  open,
  addName,
  addEmail,
  addPhone,
  addRole,
  formError,
  pending,
  credentials,
  copyHint,
  onOpenChange,
  onAddNameChange,
  onAddEmailChange,
  onAddPhoneChange,
  onAddRoleChange,
  onCopyCredential,
  onSubmit,
}: {
  open: boolean;
  addName: string;
  addEmail: string;
  addPhone: string;
  addRole: OrgRole;
  formError: string | null;
  pending: boolean;
  credentials: OrgMemberAddCredentials | null;
  copyHint: string | null;
  onOpenChange: (open: boolean) => void;
  onAddNameChange: (value: string) => void;
  onAddEmailChange: (value: string) => void;
  onAddPhoneChange: (value: string) => void;
  onAddRoleChange: (role: OrgRole) => void;
  onCopyCredential: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {credentials ? (
          <>
            <DialogHeader>
              <DialogTitle>Member added</DialogTitle>
              <DialogDescription>
                Share these login credentials once. They will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <CredentialRow
                label="Email"
                value={credentials.email}
                onCopy={() => onCopyCredential(credentials.email)}
              />
              <CredentialRow
                label="Temporary password"
                value={credentials.temporaryPassword}
                onCopy={() => onCopyCredential(credentials.temporaryPassword)}
              />
              {copyHint ? (
                <p className="text-xs text-muted-foreground" role="status">
                  {copyHint}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add member</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="add-name" className="mb-1 block text-sm font-medium">
                  Name
                </label>
                <Input
                  id="add-name"
                  value={addName}
                  onChange={(event) => onAddNameChange(event.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div>
                <label htmlFor="add-email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <Input
                  id="add-email"
                  type="email"
                  value={addEmail}
                  onChange={(event) => onAddEmailChange(event.target.value)}
                  placeholder="jane@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="add-phone" className="mb-1 block text-sm font-medium">
                  Phone{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="add-phone"
                  value={addPhone}
                  onChange={(event) => onAddPhoneChange(event.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label htmlFor="add-role" className="mb-1 block text-sm font-medium">
                  Role
                </label>
                <OrgMemberRoleSelect value={addRole} onChange={onAddRoleChange} />
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Adding…" : "Add member"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OrgMemberEditDialog({
  open,
  editingMember,
  editName,
  editPhone,
  editRole,
  formError,
  pending,
  onOpenChange,
  onEditNameChange,
  onEditPhoneChange,
  onEditRoleChange,
  onSubmit,
}: {
  open: boolean;
  editingMember: OrgMemberSummary | null;
  editName: string;
  editPhone: string;
  editRole: OrgRole;
  formError: string | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onEditNameChange: (value: string) => void;
  onEditPhoneChange: (value: string) => void;
  onEditRoleChange: (role: OrgRole) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(event) => onEditNameChange(event.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label htmlFor="edit-email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Input
              id="edit-email"
              type="email"
              value={editingMember?.email ?? ""}
              readOnly
              disabled
            />
          </div>
          <div>
            <label htmlFor="edit-phone" className="mb-1 block text-sm font-medium">
              Phone
            </label>
            <Input
              id="edit-phone"
              value={editPhone}
              onChange={(event) => onEditPhoneChange(event.target.value)}
              placeholder="+1234567890"
            />
          </div>
          <div>
            <label htmlFor="edit-role" className="mb-1 block text-sm font-medium">
              Role
            </label>
            <OrgMemberRoleSelect value={editRole} onChange={onEditRoleChange} />
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
