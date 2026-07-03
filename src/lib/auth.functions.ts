import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InitialUserInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Bootstrap the very first account. Only works when the project has 0 users.
 * Signup is disabled globally, so this is the single supported way to create
 * the initial admin without touching the Cloud dashboard.
 */
export const createInitialUser = createServerFn({ method: "POST" })
  .inputValidator((data) => InitialUserInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (listError) throw new Error(listError.message);
    if ((list.users?.length ?? 0) > 0) {
      throw new Error("Er bestaat al een account. Log in met je bestaande gegevens.");
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const hasAnyUser = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  return { exists: (data.users?.length ?? 0) > 0 };
});
