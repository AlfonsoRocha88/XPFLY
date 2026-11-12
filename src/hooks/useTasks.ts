import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Task, TaskInsert, TaskUpdate } from "@/lib/types";

export const TASKS_KEY = ["all-tasks"] as const;
const TASK_KEYS = [TASKS_KEY] as const;

export const useTasks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Run the daily auto-reset only once per session (not on every query refetch).
  const dailyResetDone = useRef(false);
  useEffect(() => {
    if (!user || dailyResetDone.current) return;
    dailyResetDone.current = true;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    supabase
      .from("tasks")
      .update({ status: "todo", completed_at: null, xp_awarded: false })
      .eq("user_id", user.id)
      .eq("is_daily", true)
      .eq("status", "done")
      .lt("completed_at", todayStart.toISOString())
      .then(() => {
        queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      });
  }, [user, queryClient]);

  // One request for every task: the lists below are derived from it in memory.
  // (Before, four overlapping queries hit the same table on every load and after every change.)
  const allQuery = useQuery({
    queryKey: TASKS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .not("tags", "cs", '{tipo:horario}')
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const lists = useMemo(() => {
    const all = allQuery.data ?? [];
    return {
      tasks: all.filter((t) => !t.parent_task_id && !t.is_daily),
      dailyTasks: all.filter((t) => !t.parent_task_id && t.is_daily),
      subtasks: all.filter((t) => !!t.parent_task_id),
      // Newest first, as the calendar expects.
      allTasks: [...all].sort((x, y) => (y.created_at ?? "").localeCompare(x.created_at ?? "")),
    };
  }, [allQuery.data]);

  const invalidateAll = () => {
    TASK_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  };

  // Patch every cached task list in place so checkboxes respond instantly.
  const patchCaches = (id: string, patch: (t: Task) => Task | null) => {
    TASK_KEYS.forEach((queryKey) => {
      queryClient.setQueriesData<Task[]>({ queryKey }, (old) =>
        old?.flatMap((t) => (t.id === id ? (patch(t) ?? []) : [t])),
      );
    });
  };

  const createTask = useMutation({
    mutationFn: async (task: Omit<TaskInsert, "user_id">) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...task, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await Promise.all(TASK_KEYS.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      patchCaches(id, (t) => ({ ...t, ...updates } as Task));
    },
    onError: () => invalidateAll(),
    onSuccess: (data, vars) => {
      invalidateAll();
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await Promise.all(TASK_KEYS.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      patchCaches(id, () => null);
    },
    onSettled: () => {
      invalidateAll();
    },
  });

  return {
    ...lists,
    isLoading: allQuery.isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
};
