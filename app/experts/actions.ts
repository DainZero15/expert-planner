"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.coerce.number().int().min(0).max(180),
  visitMinutes: z.coerce.number().int().min(5).max(480),
  areas: z.string().optional(),
  excluded: z.string().optional(),
  preferences: z.string().optional(),
});

export async function add(formData: FormData) {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (!result.success) redirect("/experts" as never);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const expert = result.data;
  const { error } = await supabase.from("experts").insert({
    name: expert.name,
    start_address: { address: expert.start },
    end_address: { address: expert.end },
    start_time: expert.startTime,
    end_time: expert.endTime,
    break_minutes: expert.breakMinutes,
    default_visit_minutes: expert.visitMinutes,
    service_areas: expert.areas?.split(",").map((area) => area.trim()).filter(Boolean),
    excluded_areas: expert.excluded?.split(",").map((area) => area.trim()).filter(Boolean),
    preferences: { notes: expert.preferences || "" },
  });

  if (error) redirect("/experts" as never);

  revalidatePath("/experts");
  redirect("/experts" as never);
}
