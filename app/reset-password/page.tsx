import { cookies } from "next/headers";
import { authClient } from "@/lib/server/supabase";
import { isDemo } from "@/lib/server/config";
import { validRecoveryTicket } from "@/lib/server/recovery-ticket";
import { ResetPassword } from "@/components/reset-password";

export default async function ResetPasswordPage() {
  if (isDemo()) return <ResetPassword available={false} />;
  try {
    const {
      data: { user },
    } = await (await authClient()).auth.getUser();
    const ticket = (await cookies()).get("classroom_recovery")?.value;
    return (
      <ResetPassword
        available={!!user && validRecoveryTicket(ticket, user.id)}
      />
    );
  } catch {
    return <ResetPassword available={false} />;
  }
}
