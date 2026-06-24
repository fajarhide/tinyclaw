import { Navigate } from "react-router-dom";
import { TelegramSettingsCard } from "@/components/TelegramSettingsCard";
import { WhatsAppSettingsCard } from "@/components/WhatsAppSettingsCard";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

export function IntegrationsPage() {
  const { activeOrg, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (activeOrg?.role !== "admin") {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <TelegramSettingsCard />
      <WhatsAppSettingsCard />
    </div>
  );
}
