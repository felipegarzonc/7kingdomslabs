import { Card, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { InviteForm } from "./invite-form";

export default async function NewParticipantPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Invitar participante" subtitle="Al entrar por primera vez verá el consentimiento y el onboarding." />
      <Card className="max-w-lg">
        <InviteForm />
      </Card>
    </>
  );
}
