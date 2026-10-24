import { redirect } from "next/navigation";

// Sign-in lives on the landing page: a name only, no email or password.
export default function LoginPage() {
  redirect("/#sign-in");
}
