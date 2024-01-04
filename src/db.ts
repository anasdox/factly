import { supabase } from "./supabaseClient";

export const db = {
	project: () => supabase.from('project')
};