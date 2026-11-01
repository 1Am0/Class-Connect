import { isDemo } from "@/lib/server/config";
import { Login } from "@/components/login";
export default function LoginPage() {
  return <Login demo={isDemo()} />;
}
